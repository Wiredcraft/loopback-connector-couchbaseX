'use strict';

const Promise = require('bluebird');
const debug = require('debug')('loopback:connector:couchbase3:n1ql');
const N1qlQuery = require('couchbase').N1qlQuery;

module.exports.Couchbase = {
  /**
   * Implement `autoupdate()`.
   *
   * @see `DataSource.prototype.autoupdate()`
   */
  autoupdate(models, callback) {
    debug('autoupdate', this.settings);
    // Create views.
    let designDocs = this.defaultDesignDocs;
    if (this.settings.designDocs) {
      designDocs = Object.assign({}, designDocs, this.settings.designDocs);
    }
    let promise = Promise.resolve(true);
    for (let name in designDocs) {
      promise = promise.then(() => {
        return this.createPrimaryIndex({ ignoreIfExists: true }).then(() => {
          return this.upsertDesignDocument(name, designDocs[name]).then((res) => {
            debug('created design document', name, designDocs[name], res);
            return res;
          });
        });
      });
    }
    return promise.asCallback(callback);
  },

  createPrimaryIndex(options) {
    return this.manager().call('createPrimaryIndexAsync', options);
  },

  /**
   * Monkey Patch for demo
   */
  all(modelName, query, options, callback) {
    // Clone query.
    query = Object.assign({}, query || {});
    const ids = this.getIdsFromWhere(modelName, query.where);
    // Result must be an array.
    let promise;
    if (ids) {
      promise = this.findByIds(modelName, ids, options);
    } else {
      promise = this.findByFilters(modelName, query, options);
    }
    return promise.asCallback(callback);
  }
};

var comparison = function(op) {
  var symbols = {
    nlike: 'NOT LIKE',
    like: 'LIKE',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<='
  };
  return function(key, value, ql, params) {
    var name = `${op}_${key}`;
    ql += ` AND ${key} ${symbols[op]} $${name}`;
    params[name] = value;
    return ql;
  };
};

var regexp = function(key, value, ql, params) {
  var name = `regexp_${key}`;
  ql += ` AND REGEX_LIKE(${key}, $${name})`;
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
  regexp
};

module.exports.Accessor = {
  operators: ['inq', 'gt', 'gte', 'lt', 'lte', 'like'],
  findByFilters(filters, options) {
    const params = {};
    let fields = '*';
    if (filters.fields) {
      fields = filters.fields.join(',');
    }
    fields += ',TOSTRING(META().id) AS id';
    let ql = `SELECT ${fields} from \`${this.settings.bucket.name}\` WHERE _type='${this.modelName}'`;
    if (filters.where) {
      const keys = Object.keys(filters.where);
      keys.forEach(key => {
        const value = filters.where[key];
        if (Array.isArray(value)) {
          ql += ` AND ${key} IN $${key}`;
          params[key] = value;
          return;
        }
        if (typeof value === 'object') {
          Object.keys(value).forEach(e => {
            var op = operators[e];
            var v = value[e];
            ql = op(key, v, ql, params);
          });
          return;
        } else {
          ql += ` AND ${key}=$${key}`;
          params[key] = value;
        }
      });
    }
    if (filters.limit) {
      const limit = parseInt(filters.limit);
      if (isNaN(limit) || limit < 0) {
        throw new Error('invalid parameter: limit');
      }
      ql += ` LIMIT ${limit}`;
    }

    if (filters.skip) {
      const skip = parseInt(filters.skip);
      if (isNaN(skip) || skip < 0) {
        throw new Error('invalid parameter: limit');
      }
      ql += ` OFFSET ${skip}`;
    }

    if (filters.order) {
      var orders = filters.order;
      if (typeof orders === 'string') {
        orders = [orders];
      }
      if (!Array.isArray(orders)) {
        throw new Error('invalid parameter: the order should be a Array');
      }
      orders.forEach(order => {
        if (!(order.endsWith('ASC') || order.endsWith('DESC'))) {
          throw new Error('invalid parameter: the order\' value should ends with ASC|DESC');
        }
      });
      ql += ` ORDER BY ${orders.join(',')}`;
    }

    debug(`N1QL findByFilters: ${ql}， params: ${JSON.stringify(params)}`);
    const n1Query = N1qlQuery.fromString(ql);
    return this.connection.call('queryAsync', n1Query, params).map(res => {
      // The returns construct is { test_bucket: {}}
      // need to be unpacked
      if (res.hasOwnProperty(this.settings.bucket.name)) {
        return [res.id, res[this.settings.bucket.name]];
      }
      return [res.id, res];
    });
  }
};

