'use strict';

var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var process = require('process');
var esprima = require('esprima');

/**
 * A special `promisifyAll`. The `openBucket()` method (in class `Cluster`) has both a return which
 * is the bucket, and a callback which is the error.
 *
 * @param  {Object} target
 * @return {Object}
 */
exports.promisifyAllResolveWithReturn = function(target) {
  return Promise.promisifyAll(target, {
    promisifier: promisifier
  });
};

/**
 * Helper.
 *
 * @param  {Function} originalMethod
 * @return {Function}
 * @private
 */
function promisifier(originalMethod) {
  return function promisified() {
    var self = this;
    var args = [].slice.call(arguments);
    return new Promise(function(resolve, reject) {
      var res;
      args.push(function(err) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
      res = originalMethod.apply(self, args);
    });
  };

}

function walkSync(dir, filelist = [], callback) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (!file.startsWith('.') && file !== 'node_modules' && fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist, callback);
    } else {
      if (path.extname(file) === '.js') {
        callback(path.join(dir, file));
      }
    }
  });
  return filelist;
};

function parseObjectArg(arg) {
  var result = {};
  arg.properties.forEach(property => {
    switch (property.value.type) {
      case 'ObjectExpression':
        result[property.key.name] = parseObjectArg(property.value);
        break;
      case 'Literal':
        result[property.key.name] = property.value.value;
        break;
    };
  });
  return result;
}

function parseArgs(args) {
  var result = [];
  args.forEach(arg => {
    switch (arg.type) {
      case 'Literal':
        result.push(arg.value);
        break;
      case 'ObjectExpression':
        result.push(parseObjectArg(arg));
        break;
    };
  });
  if (result.length === 1) {
    return result[0];
  }
  return result;
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Find out all the CallExpression(e.g. Persoon.find({where: {}}))
 * via static code anaylsis
 *
 * @param {Array} models The list of models
 */
function findAllModelMethod(models) {
  var methods = [];
  var result = {};
  walkSync(process.cwd(), [], function(file) {
    var fd = fs.openSync(file, 'r');
    var code = fs.readFileSync(fd).toString();
    esprima.parseModule(code, {}, (node, meta) => {
      if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.property.name === 'find' &&
        models.includes(node.callee.object.name)) {
        methods.push(node);
      }
    });
  });
  methods.forEach(method => {
    var name = method.callee.object.name;
    var args = parseArgs(method.arguments);
    if (args.where) {
      var where = Object.keys(args.where);
      if (where.length === 0) {
        return;
      }
      // Remove duplicated
      // 1.Sort By name
      // 2.Join as String
      where.sort();
      where = where.join(',');
      // If users use find({ where: {id: 1234 }})
      if (where === 'id') {
        return;
      }
      if (!result.hasOwnProperty(name)) {
        result[name] = [];
      }
      if (!result[name].includes(where)) {
        result[name].push(where);
      }
    }
  });
  return result;
};

exports.getViewName = function(fields) {
  return 'by' + fields.map(capitalize).join('And');
};

/**
 * GengerateViews from Static Code Analysis
 *
 * @param {Array} models The list of models
 */
exports.generateViews = function(models) {
  var designDocs = { query: { views: { } } };
  var methods = findAllModelMethod(models);
  Object.keys(methods).forEach(key => {
    var model = methods[key];
    model.forEach(e => {
      var fields = e.split(',').map(e => { return 'doc.' + e; }).join(',');
      var view =  `function(doc, meta) {
        if (doc._type) {
          emit([doc._type,${fields}], null);
        }
      }`;
      var name = this.getViewName(e.split(','));
      designDocs.query.views[name] = { map: view };
    });
  });
  return designDocs;
};

/**
* Generate Where N1QL Clause
*
* @param {object} where Where object
*/
exports.generateWhere = function(where, params) {
  var stack = [];
  var counter = () => {
    var num = 0;
    return () => {
      num += 1;
      return num;
    };
  };
  var index = counter();

  var comparison = function(op) {
    var symbols = {
      nlike: 'NOT LIKE',
      like: 'LIKE',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      neq: '!='
    };
    return function(key, value, params) {
      var name = `${op}_${key}_${index()}`;
      params[name] = value;
      return `${key} ${symbols[op]} $${name}`;
    };
  };

  var regexp = function(key, value, params) {
    var name = `regexp_${key}_${index()}`;
    var ql = `REGEX_LIKE(${key}, $${name})`;
    if (value instanceof RegExp) {
      params[name] = value.source;
      return ql;
    }
    if (typeof value === 'string') {
      params[name] = value;
      return ql;
    }
    throw new Error('invalid regexp');
  };

  var operators = {
    like: comparison('like'),
    nlike: comparison('nlike'),
    gt: comparison('gt'),
    gte: comparison('gte'),
    lt: comparison('lt'),
    lte: comparison('lte'),
    neq: comparison('neq'),
    regexp
  };

  /**
   * Normalize the Where filters
   *
   * @param {object} data Condition object
  */
  var normalize = (data) => {
    var ands = data.and || [];
    var ors = data.or || [];
    delete data.and;
    delete data.or;
    if (Array.isArray(ands)) {
      if (Object.keys(data).length > 0) {
        ands.push(data);
      }
    }
    return [ands, ors];
  };
  var generateClause = (data) => {
    return Object.keys(data).map(key => {
      var name = `${key}_${index()}`;
      var value = data[key];
      if (Array.isArray(value)) {
        params[name] = value;
        return `${key} IN $${name}`;
      }
      if (typeof value === 'object') {
        return Object.keys(value).map(e => {
          var op = operators[e];
          var v = value[e];
          return op(key, v, params);
        }).join(' AND ');
      } else {
        params[name] = value;
        return `${key}=$${name}`;
      }
    });
  };

  var render = (data, op) => {
    if (Array.isArray(data)) {
      return data.map(e => { return render(e, op); }).join(op);
    }
    if (Object.keys(data).length === 0) {
      return;
    }
    return '(' + generateClause(data).join(op) + ')';
  };

  var walk = (data, op = ' AND ') => {
    if (data.hasOwnProperty('and') || data.hasOwnProperty('or')) {
      var result = [];
      var [ands, ors] = normalize(data);
      stack.push(ors);
      var andStr = walk(ands);
      var orStr = walk(stack.pop(), op = ' OR ');
      if (andStr) {
        result.push(andStr);
      }
      if (orStr) {
        result.push(orStr);
      }
      return '(' + result.join(op) + ')';
    } else {
      return render(data, op);
    }
  };
  return walk(where);
};
