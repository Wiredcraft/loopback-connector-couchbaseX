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

/**
 * Initialize the Couchbase connector for the given data source
 *
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

  // Though not mentioned, `dataSource.setup()` assumes it's connected when
  // `initialize()` is done.
  debug('Initialize and connect');
  dataSource.connector.connect(callback);
};

exports.Couchbase = Couchbase;

/**
 * The constructor for Couchbase connector
 *
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function Couchbase(settings, dataSource) {
  Connector.call(this, 'couchbase3', settings);

  debug('Settings: %j', settings);

  this.dataSource = dataSource;

  // We only need one cluster instance.
  this._cluster = Promise.resolve(new couchbase.Cluster(settings.cluster.url, settings.cluster.options))
    .then(utils.promisifyAllResolveWithReturn);
}

util.inherits(Couchbase, Connector);

/**
 * Connect to Couchbase
 *
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.connect = function(callback) {
  // A connection is established when a bucket is open.
  // @see http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/performance-tuning.html
  if (this._bucket == null) {
    this._bucket = this.openBucket();
  }
  // Callback is optional.
  return this._bucket.asCallback(callback);
};

/**
 * You don't need to use this directly usually. Use `connect()` instead.
 *
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
    // Callback is optional.
    return Promise.resolve(true).asCallback(callback);
  }
  // Disconnect.
  var promise = this._bucket.call('disconnect').return(true);
  // Cleanup.
  this._bucket = null;
  this._manager = null;
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Make sure the data has a `_type` attribute.
 *
 * @param  {String} model The model name
 * @param  {Object} data  The model data
 * @return {Promise}      The validated data
 */
Couchbase.prototype.ensureType = function(model, data) {
  if (data._type != null && data._type !== model) {
    return Promise.reject(new Error('...'));
  }
  data._type = model;
  return Promise.resolve(data);
};

/**
 * Helper.
 *
 * @param  {Object} data What the Bucket would return with the OpCallback()
 * @return {Promise}     The unpacked data
 */
Couchbase.prototype.unpackRes = function(data) {
  // CAS is required.
  if (data == null || data.cas == null) {
    return Promise.resolve(null);
  }
  var unpacked = {};
  // Values are extracted to the top level.
  if (data.value != null) {
    Object.assign(unpacked, data.value);
  }
  unpacked._cas = data.cas;
  return Promise.resolve(unpacked);
};

/**
 * Hooks.
 */

/**
 * Implement `create()`. Create an instance of Model with given data and save to the attached data
 * source.
 *
 * @see `DataAccessObject.create()`
 */
Couchbase.prototype.create = function create(model, data, options, callback) {
  var connection = this.connect();
  var id = this.getIdValue(model, data);
  // Generate ID and set it back.
  if (id == null) {
    id = uuid.v4();
    this.setIdValue(model, data, id);
  }
  // Result need to be `id` and `res`.
  var promise = this.ensureType(model, data).then(function(data) {
    return connection.call('insertAsync', id, data, options);
  }).then(function(data) {
    return [id, data.cas];
  });
  // Callback is optional.
  return promise.asCallback(callback, { spread: true });
};

/**
 * Implement `save()`. Save instance.
 *
 * @see `DataAccessObject.save()`
 */
Couchbase.prototype.save = function save(model, data, options, callback) {
  var connection = this.connect();
  var id = this.getIdValue(model, data);
  // Result is not used.
  var promise = this.ensureType(model, data).then(function(data) {
    return connection.call('replaceAsync', id, data, options);
  });
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Implement `destroy()`. Delete object from persistence.
 *
 * @see `DataAccessObject.remove()`
 */
Couchbase.prototype.destroy = function destroy(model, id, options, callback) {
  // Result is just an info.
  var promise = this.connect().call('removeAsync', id, options).return({
    count: 1
  }).catchReturn({
    count: 0
  });
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Implement `updateOrCreate()`. Update or insert a model instance.
 *
 * @see `DataAccessObject.updateOrCreate()`
 */
Couchbase.prototype.updateOrCreate = function upsert(model, data, options, callback) {
  var connection = this.connect();
  var id = this.getIdValue(model, data);
  // Result need to be the updated data.
  var promise = this.ensureType(model, data).then(function(data) {
    return connection.call('upsertAsync', id, data, options);
  }).then(function() {
    return connection.call('getAsync', id);
  }).then(this.unpackRes);
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Find.
 */

/**
 * If given, get the keys from the where filter.
 *
 * @return {Array|null}
 */
Couchbase.prototype.getKeysFromWhere = function(modelName, where) {
  if (where == null) {
    return null;
  }
  const id = this.getIdValue(modelName, where);
  if (id == null) {
    return null;
  }
  if (typeof id === 'number' || typeof id === 'string' || Buffer.isBuffer(id)) {
    return [id];
  }
  if (Array.isArray(id.inq)) {
    return id.inq;
  }
  // TODO: other filter operators?
  return null;
};

/**
 * Invoke a bucket method for the given keys.
 *
 * @param  {Sting} method
 * @param  {Array} keys
 * @param  {Object} options
 * @return {Promise}
 */
Couchbase.prototype.invokeForKeys = function(method, keys, options) {
  var connection = this.connect();
  var promises = keys.map(function(key) {
    return connection.call(method, key, options).then(function(res) {
      return res;
    }).catch(function(err) {
      return null;
    });
  });
  return Promise.all(promises).map(this.unpackRes);
};

/**
 * Hooks that do bulk operations.
 */

/**
 * Implement `all()`. Find all instances of Model that match the specified query.
 *
 * @see `DataAccessObject.find()`
 */
Couchbase.prototype.all = function all(model, query, options, callback) {
  // TODO: ?
  if (query.where == null) {
    return Promise.reject(new Error('Query condition needed')).asCallback(callback);
  };
  var keys = this.getKeysFromWhere(model, query.where);
  // Result need to be an array.
  if (keys) {
    var promise = this.invokeForKeys('getAsync', keys, options).then(function(res) {
      return res.filter(function(ress) {
        return ress !== null;
      });
    });
  } else {
    // TODO: Do query
    var promise = Promise.reject(new Error('Primary key needed'));
  }
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Implement `update()`. Update multiple instances that match the where clause.
 *
 * @see `DataAccessObject.update()`
 * @see https://apidocs.strongloop.com/loopback/#persistedmodel-updateall
 * @deprecated This API (`updateAll`) is super confusing and most likely useless.
 */
// Couchbase.prototype.update = function update(model, where, data, options, callback) {};

/**
 * Implement `destroyAll()`. Destroy all matching records.
 *
 * @see `DataAccessObject.remove()`
 */
Couchbase.prototype.destroyAll = function destroyAll(model, where, options, callback) {
  var keys = this.getKeysFromWhere(model, where);
  // Result is just an info.
  if (keys) {
    var promise = this.invokeForKeys('removeAsync', keys, options).then(function(res) {
      var count = res.filter(function(ress) {
        return ress !== null;
      }).length;
      return { count: count };
    });
  } else {
    // TODO: Do query
    var promise = Promise.reject(new Error('...'));
  }
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Ping db server.
 */
Couchbase.prototype.ping = function(callback) {
  if (this._bucket == null) {
    var promise = Promise.reject(new Error('not connected'));
  } else {
    var connection = this.connect();
    var promise = connection.call('getAsync', '1').then(function(res) {
      return true;
    }).catch(function(err) {
      if (err.message === 'The key does not exist on the server') {
        return true;
      }
      return Promise.reject(err);
    });
  }
  // Callback is optional.
  return promise.asCallback(callback);
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
 * Build a new view query.
 *
 * @see http://docs.couchbase.com/sdk-api/couchbase-node-client-2.1.2/ViewQuery.html
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
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    if (options[key] != null) {
      query = query[key].call(query, options[key]);
      delete options[key];
    }
  }
  var keys = ['range', 'id_range'];
  for (var i = 0, len = keys.length; i < len; i++) {
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
 *
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

/**
 * Cluster Manager APIs.
 */

Couchbase.prototype.clusterManager = function(username, password) {
  // Only one manager is needed.
  if (this._clusterManager == null) {
    this._clusterManager = this._cluster.call('manager', username, password).then(Promise.promisifyAll);
  };
  return this._clusterManager;
};
