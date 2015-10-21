/*!
 * Module dependencies
 */
var couchbase = require('couchbase');
var util = require('util');
var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:couchbase3');
var Promise = require('bluebird');
var uuid = require('node-uuid');

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
    settings.cluster.url = 'couchbase://127.0.0.1';
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
}

util.inherits(Couchbase, Connector);

/**
 * Connect to Couchbase
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 */
Couchbase.prototype.connect = function(callback) {
  debug('Ready to connect');
  if (callback == null) {
    callback = noop;
  }
  var self = this;
  var settings = this.settings;
  // Handle with promise.
  var promise;
  var resolved = function(res) {
    return callback(null, res);
  };
  // The cached promise.
  promise = this._connection;
  if (promise != null) {
    debug('connection already established');
    promise.then(resolved, callback);
    return promise;
  }
  /// Connect.
  promise = new Promise(function(resolve, reject) {
    self.cluster = new couchbase.Cluster(settings.cluster.url, settings.cluster.options);
    // Open bucket here.
    // @see http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/performance-tuning.html
    self.bucket = self.cluster.openBucket(settings.bucket.name, settings.bucket.password, function(err) {
      if (err) {
        debug('connection is failed');
        return reject(err);
      }
      debug('connection is established');
      resolve(self.bucket);
    });
    //Promisify bucket
    Promise.promisifyAll(self.bucket);
  });

  // Cache the promise.
  this._connection = promise;
  promise.then(resolved, callback);
  return promise;
};

/**
 * Disconnect from Couchbase
 */
Couchbase.prototype.disconnect = function(callback) {
  debug('Ready to disconnect');
  if (callback == null) {
    callback = noop;
  }
  // Handle with promise.
  var promise;
  var resolved = function(res) {
    return callback(null, res);
  };
  // The cached promise.
  promise = this._connection;
  if (promise == null) {
    debug('No connections.');
    return Promise.resolve(true).then(resolved, callback);
  }
  // Disconnect.
  promise = promise.then(function(bucket) {
    bucket.disconnect();
    debug('disconnected');
    return true;
  });
  // Cleanup.
  this._connection = null;
  this.bucket = null;
  this.cluster = null;
  return promise.then(resolved, callback);
};

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
 * Implement `updateOrCreate()`. Update or insert a model instance.
 * @see `DataAccessObject.updateOrCreate()`
 */
Couchbase.prototype.updateOrCreate = function upsert(model, data, options, callback) {
  debug('Couchbase.UPDATEOrCREATE: ' + JSON.stringify([model, data]));
  var id = this.getidvalue(model, data);
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
  debug('Couchbase.All: ', query);

  if (callback == null) {
    callback = noop;
  }

  // Handle with promise.
  var promise = self.connect();
  var resolved = function(res) {
    callback(null, [res]);
  };

  if (query.where) {
    if (query.where.id) {
      var id = query.where.id;
      if (id.inq) {
        promise = promise.then(function(bucket) {
          return bucket.getMultiAsync(id.inq);
        });
      } else {
        promise = promise.then(function(bucket) {
          return bucket.getAsync(id);
        });
      }

    } else {
      // TODO: Do query

    }
  } else {
    var id = self.getIdValue(model, query);
    promise = promise.then(function(bucket) {
      return bucket.getAsync(id);
    });
  }

  return promise.then(resolved, callback);
};

/**
 * Implement `destroyAll()`. Destroy all matching records.
 * @see `DataAccessObject.remove()`
 * @param {String} model The model name
 * @param {Object} where The object that defines the criteria
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.destroyAll = function destroyAll(model, where, options, callback) {
  var self = this;
  var idName = this.idName(model, where);
  debug('Couchbase.DESTROYALL: ' + JSON.stringify([model]));

  if (callback == null) {
    callback = noop;
  }

  // Handle with promise.
  var promise = self.connect();
  var resolved = function(res) {
    return callback(null, res);
  };

  promise = promise.then(function(bucket) {
    return bucket.removeAsync(where[idName]);
  });

  return promise.then(resolved, callback);
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
  var id = this.getidvalue(model, data);
  var promise = this.connect().call('replaceAsync', id, data, options);
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
  var self = this;
  debug('Couchbase.UPDATE: ' + JSON.stringify([model, data]));

  if (callback == null) {
    callback = noop;
  }

  // Handle with promise.
  var promise = self.connect();
  var resolved = function(res) {
    return callback(null, res);
  };

  //bucket id
  var id = self.getIdValue(model, where) || uuid.v4();

  promise = promise.then(function(bucket) {
    return bucket.upsertAsync(id, data);
  });

  return promise.then(resolved, callback);
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
 * Delete selected model instances
 * @param {String} design name
 * @param {String} view name
 * @param {String/Array} key for the view
 * @param {Object} where The object that defines the criteria
 * @param {Function} [callback] The callback function
 */
Couchbase.prototype.view = function(design, view, keys, callback) {
  var self = this;
  debug('Couchbase.view: ' + JSON.stringify({
    design: design,
    view: view,
    keys: keys
  }));

  if (callback == null) {
    callback = noop;
  }

  // Handle with promise.
  var promise = self.connect();
  var resolved = function(res) {
    return callback(null, res);
  };

  promise = promise.then(function(bucket) {
    //default stale = 1, view will immeidate update when data change
    var query = couchbase.ViewQuery.from(design, view).stale(1).key(keys);
    debug('view query:', query);
    return bucket.queryAsync(query);
  });
  return promise.then(resolved, callback);
};
