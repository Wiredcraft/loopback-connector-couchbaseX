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
 * Make sure the data has a `_type` attribute.
 * @param  {String} model The model name
 * @param  {Object} data  The model data
 * @return {Object}       The validated data
 */
Couchbase.prototype.ensureType = function(model, data) {
  if (data._type != null && data._type !== model) {
    return Promise.reject(new Error('...'));
  }
  data._type = model;
  return data;
};

/**
 * Helper.
 * @param  {Object} data What the Bucket would return with the OpCallback()
 * @return {Object}      The unpacked data
 */
Couchbase.prototype.unpackRes = function(data) {
  // CAS is required.
  if (data.cas == null) {
    return Promise.reject(new Error('...'));
  }
  var unpacked = {};
  // Values are extracted to the top level.
  if (data.value != null) {
    Object.assign(unpacked, data.value);
  }
  unpacked._cas = data.cas;
  return unpacked;
};

/**
 * Hooks.
 */

/**
 * Implement `create()`. Create an instance of Model with given data and save to
 * the attached data source.
 * @see `DataAccessObject.create()`
 */
Couchbase.prototype.create = function create(model, data, options, callback) {
  var id = this.getIdValue(model, data) || uuid.v4();
  var promise = Promise.join(this.connect(), this.ensureType(model, data), function(bucket, data) {
    return bucket.insertAsync(id, data, options);
  }).then(function(data) {
    return [id, data.cas];
  });
  if (callback == null) {
    return promise;
  }
  // Result need to be `id` and `res`.
  promise.then(function(res) {
    return callback(null, res[0], res[1]);
  }, callback);
  return promise;
};

/**
 * Implement `save()`. Save instance.
 * @see `DataAccessObject.save()`
 */
Couchbase.prototype.save = function save(model, data, options, callback) {
  var id = this.getIdValue(model, data.value || data);
  var promise = Promise.join(this.connect(), this.ensureType(model, data.value || data), function(bucket, data) {
    return bucket.replaceAsync(id, data, options);
  });
  if (callback == null) {
    return promise;
  }
  // Result is not used.
  promise.then(function() {
    return callback();
  }, callback);
  return promise;
};

/**
 * Implement `destroy()`. Delete object from persistence.
 * @see `DataAccessObject.remove()`
 */
Couchbase.prototype.destroy = function destroy(model, id, options, callback) {
  var promise = this.connect().call('removeAsync', id, options);
  if (callback == null) {
    return promise;
  }
  // Result is just an info.
  promise.then(function() {
    return callback(null, {
      count: 1
    });
  }, callback);
  return promise;
};

/**
 * Implement `updateOrCreate()`. Update or insert a model instance.
 * @see `DataAccessObject.updateOrCreate()`
 */
Couchbase.prototype.updateOrCreate = function upsert(model, data, options, callback) {
  var id = this.getIdValue(model, data);
  var promise = Promise.join(this.connect(), this.ensureType(model, data), function(bucket, data) {
    return [bucket, bucket.upsertAsync(id, data, options)];
  }).spread(function(bucket, res) {
    return bucket.getAsync(id);
  }).then(this.unpackRes);
  if (callback == null) {
    return promise;
  }
  // Result need to be the updated data.
  promise.then(function(res) {
    return callback(null, res);
  }, callback);
  return promise;
};

/**
 * @todo Implement `findOrCreate()`?
 */

/**
 * Implement `updateAttributes()`. Update set of attributes.
 * @see `DataAccessObject.updateAttributes()`
 * @todo Implement
 */
Couchbase.prototype.updateAttributes = function updateAttributes(model, id, data, options, callback) {};

/**
 * Hooks that do bulk operations.
 */

/**
 * Implement `all()`. Find all instances of Model that match the specified
 * query.
 * @see `DataAccessObject.find()`
 */
Couchbase.prototype.all = function all(model, query, options, callback) {
  if (query.where) {
    if (query.where.id) {
      var id = query.where.id;
      if (id.inq) {
        var result = this.connect().call('getMultiAsync', id.inq);
      } else {
        var result = [this.connect().call('getAsync', id, options)];
      }
    } else {
      // TODO: Do query
    }
  } else {
    var id = this.getIdValue(model, query);
    var result = [this.connect().call('getAsync', id, options)];
  }
  // Result need to be an array.
  var promise = Promise.mapSeries(result, this.unpackRes);
  if (callback == null) {
    return promise;
  }
  promise.then(function(res) {
    return callback(null, res);
  }, callback);
  return promise;
};

/**
 * Implement `update()`. Update multiple instances that match the where clause.
 * @see `DataAccessObject.update()`
 */
Couchbase.prototype.update = function update(model, where, data, options, callback) {
  var id = this.getIdValue(model, where);
  var promise = Promise.join(this.connect(), this.ensureType(model, data), function(bucket, data) {
    return bucket.replaceAsync(id, data, options);
  });
  if (callback == null) {
    return promise;
  }
  promise.then(function(res) {
    return callback(null, res);
  }, callback);
  return promise;
};

/**
 * Implement `destroyAll()`. Destroy all matching records.
 * @see `DataAccessObject.remove()`
 */
Couchbase.prototype.destroyAll = function destroyAll(model, where, options, callback) {
  var id = this.getIdValue(model, where);
  var promise = this.connect().call('removeAsync', id, options);
  if (callback == null) {
    return promise;
  }
  promise.then(function(res) {
    return callback(null, [res]);
  }, callback);
  return promise;
};

/**
 * Implement `count()`. Return count of matched records.
 * @see `DataAccessObject.count()`
 * @todo Implement
 */
Couchbase.prototype.count = function count(model, where, options, callback) {};

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
