'use strict';

/*!
 * Module dependencies
 */
var couchbase = require('couchbase');
var util = require('util');
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:couchbase3');
var Promise = require('bluebird');
var uuid = require('node-uuid');
var utils = require('./utils');

function noop(err, res) {}

/**
 * Initialize the Couchbase connector for the given data source
 * @param {DataSource} dataSource The data source instance
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings;

  // Cluster.
  if (settings.cluster == null) {
    settings.cluster = {};
  }
  if (settings.cluster.url == null) {
    debug('Cluster URL settings missing; trying default');
    settings.cluster.url = 'couchbase://localhost';
  }
  if (settings.cluster.options == null) {
    settings.cluster.options = {};
  }

  // Bucket.
  if (settings.bucket == null) {
    settings.bucket = {};
  }
  if (settings.bucket.name == null) {
    debug('Bucket name settings missing; trying default');
    settings.bucket.name = 'default';
  }
  if (settings.bucket.password == null) {
    settings.bucket.password = '';
  }

  dataSource.connector = new Couchbase(settings, dataSource);

  // Though not mentioned, initialize() is expected to connect().
  // @see dataSource.setup()
  if (callback) {
    debug('Initialize and connect');
    dataSource.connector.connect(callback);
  }
};

/**
 * The constructor for Couchbase connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function Couchbase(settings, dataSource) {
  Connector.call(this, 'couchbase', settings);

  debug('Settings: %j', settings);

  this.dataSource = dataSource;

  // We only need one cluster instance.
  this._cluster = Promise.resolve(new couchbase.Cluster(settings.cluster.url, settings.cluster.options))
    .then(utils.promisifyAllResolveWithReturn);
}

util.inherits(Couchbase, Connector);

/**
 * Connect to Couchbase
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Object} bucket The bucket instance
 */
Couchbase.prototype.connect = function(callback) {
  // A connection is established when a bucket is open.
  // @see http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/performance-tuning.html
  if (this._bucket == null) {
    this._bucket = this.openBucket();
  }
  // Callback is optional.
  if (callback == null) {
    return this._bucket;
  }
  this._bucket.then(function(res) {
    return callback(null, res);
  }, callback);
  return this._bucket;
};

/**
 * You don't need to use this directly usually. Use `connect()` instead.
 * @private
 * @return {Promise} The bucket
 */
Couchbase.prototype.openBucket = function() {
  var settings = this.settings.bucket;
  return this._cluster.call('openBucketAsync', settings.name, settings.password)
    .then(Promise.promisifyAll);
};

/**
 * Disconnect from Couchbase
 */
Couchbase.prototype.disconnect = function(callback) {
  if (this._bucket == null) {
    debug('not connected');
    if (callback == null) {
      return Promise.resolve(true);
    }
    return callback(null, true);
  }
  // Disconnect.
  var promise = this._bucket.call('disconnect').then(true);
  // Cleanup.
  this._bucket = null;
  this._manager = null;
  // Callback is optional.
  if (callback == null) {
    return promise;
  }
  promise.then(function(res) {
    return callback(null, res);
  }, callback);
  return promise;
};

/**
 * Hooks.
 */

/**
 * Implement `create()`. Create an instance of Model with given data and save to
 * the attached data source.
 * @see `DataAccessObject.create()`
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Object} options
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.create = function create(model, data, options, callback) {
  debug('Couchbase.CREATE: ' + JSON.stringify([model, data]));
  var id = this.getIdValue(model, data) || uuid.v4();
  var promise = this.connect().call('insertAsync', id, data, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, res);
  }, callback);
};

/**
 * Implement `update()`. Update multiple instances that match the where clause.
 * @see `DataAccessObject.update()`
 * @param {String} model The model name
 * @param {Object} where The query condition
 * @param {Object} data The model data
 * @param {Object} options
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.update = function update(model, where, data, options, callback) {
  debug('Couchbase.UPDATE: ' + JSON.stringify([model, data]));
  var id = this.getIdValue(model, where);
  var promise = this.connect().call('replaceAsync', id, data, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, res);
  }, callback);
};

/**
 * Implement `updateOrCreate()`. Update or insert a model instance.
 * @see `DataAccessObject.updateOrCreate()`
 */
Couchbase.prototype.updateOrCreate = function upsert(model, data, options, callback) {
  debug('Couchbase.UPDATEOrCREATE: ' + JSON.stringify([model, data]));
  var id = this.getIdValue(model, data);
  var promise = this.connect().call('upsertAsync', id, data, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, res);
  }, callback);
};

/**
 * @todo Implement `findOrCreate()`?
 */

/**
 * Implement `all()`. Find all instances of Model that match the specified
 * query.
 * @see `DataAccessObject.find()`
 * @param {String} model The model name
 * @param {Object} query The query condition
 * @param {Object} options
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.all = function all(model, query, options, callback) {
  var self = this;
  debug('Couchbase.All: ' + JSON.stringify([model, query]));

  if (query.where) {
    if (query.where.id) {
      var id = query.where.id;
      if (id.inq) {
        var promise = self.connect().call('getMultiAsync', id.inq);
      } else {
        var promise = self.connect().call('getAsync', id, options);
      }
    } else {
      // TODO: Do query
    }
  } else {
    var id = self.getIdValue(model, query);
    var promise = self.connect().call('getAsync', id, options);
  }

  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, [res]);
  }, callback);
};

/**
 * Implement `destroyAll()`. Destroy all matching records.
 * @see `DataAccessObject.remove()`
 * @param {String} model The model name
 * @param {Object} where The object that defines the criteria
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.destroyAll = function destroyAll(model, where, options, callback) {
  debug('Couchbase.DESTROYALL: ' + JSON.stringify([model, where]));
  var id = this.getIdValue(model, where);
  var promise = this.connect().call('removeAsync', id, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, [res]);
  }, callback);
};

/**
 * Implement `count()`. Return count of matched records.
 * @see `DataAccessObject.count()`
 * @todo Implement
 */
Couchbase.prototype.count = function count(model, where, options, callback) {
  debug('Couchbase.COUNT: ' + JSON.stringify([model, id]));
};

/**
 * Implement `save()`. Save instance.
 * @see `DataAccessObject.save()`
 */
Couchbase.prototype.save = function save(model, data, options, callback) {
  debug('Couchbase.SAVE: ' + JSON.stringify([model, id]));
  var id = this.getIdValue(model, data);
  var promise = this.connect().call('replaceAsync', id, data, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, res);
  }, callback);
};

/**
 * Implement `destroy()`. Delete object from persistence.
 * @see `DataAccessObject.remove()`
 */
Couchbase.prototype.destroy = function destroy(model, id, options, callback) {
  debug('Couchbase.DESTROY: ' + JSON.stringify([model, id]));
  var promise = this.connect().call('removeAsync', id, options);
  if (callback == null) {
    return promise;
  }
  return promise.then(function(res) {
    return callback(null, res);
  }, callback);
};

/**
 * Implement `updateAttributes()`. Update set of attributes.
 * @see `DataAccessObject.updateAttributes()`
 * @todo Implement
 */
Couchbase.prototype.updateAttributes = function updateAttributes(model, id, data, options, callback) {
  debug('Couchbase.UPDATEATTRIBUTE: ' + JSON.stringify([model, id]));
};

/**
 * ViewQuery APIs.
 */

/**
 * Shortcut.
 */
Couchbase.prototype.view = function(designDoc, viewName, options) {
  return this.runViewQuery(this.newViewQuery(designDoc, viewName, options));
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.runViewQuery = function(query, params) {
  return this.connect().call('queryAsync', query, params);
};

/**
 * Build a new view query. @see
 * http://docs.couchbase.com/sdk-api/couchbase-node-client-2.1.2/ViewQuery.html
 * @param  {String} designDoc
 * @param  {String} viewName
 * @param  {Object} options
 * @return {Object}
 */
Couchbase.prototype.newViewQuery = function(designDoc, viewName, options) {
  // With some defaults.
  var query = couchbase.ViewQuery.from(designDoc, viewName).order(1).stale(1);
  if (options == null) {
    return query;
  }
  // The SDK made it easier for some options formats.
  // TODO: ugly.
  var keys = ['stale', 'order', 'group', 'group_level', 'key', 'keys', 'include_docs', 'full_set', 'on_error'];
  var len = keys.length;
  var i;
  for (i = 0; i < len; i++) {
    var key = keys[i];
    if (options[key] != null) {
      query = query[key].call(query, options[key]);
      delete options[key];
    }
  }
  var keys = ['range', 'id_range'];
  var len = keys.length;
  var i;
  for (i = 0; i < len; i++) {
    var key = keys[i];
    if (options[key] != null) {
      query = query[key].apply(query, options[key]);
      delete options[key];
    }
  }
  query = query.custom(options);
  return query;
};

/**
 * Bucket Manager APIs.
 */

/**
 * You don't need to use this directly usually. Use the APIs below.
 * @private
 */
Couchbase.prototype.manager = function() {
  // Only one manager is needed.
  if (this._manager == null) {
    this._manager = this.connect().call('manager').then(Promise.promisifyAll);
  };
  return this._manager;
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.getDesignDocument = function(name) {
  return this.manager().call('getDesignDocumentAsync', name);
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.getDesignDocuments = function() {
  return this.manager().call('getDesignDocumentsAsync');
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.insertDesignDocument = function(name, data) {
  return this.manager().call('insertDesignDocumentAsync', name, data);
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.removeDesignDocument = function(name) {
  return this.manager().call('removeDesignDocumentAsync', name);
};

/**
 * Simply proxy the method.
 */
Couchbase.prototype.upsertDesignDocument = function(name, data) {
  return this.manager().call('upsertDesignDocumentAsync', name, data);
};
