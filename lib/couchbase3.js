'use strict';

/*!
 * Module dependencies
 */
const debug = require('debug')('loopback:connector:couchbase3');

const couchbase = require('couchbase');
const Promise = require('bluebird');
const uuid = require('uuid');
const utils = require('./utils');

const NoSQL = require('loopback-connector-nosql');
const Accessor = NoSQL.Accessor;

// The default design documents.
const mapByModelName = `function(doc, meta) {
  if (doc._type) {
    emit(doc._type, null);
  }
}`;
const defaultDesignDocs = {
  connector: {
    views: {
      byModelName: {
        map: mapByModelName
      }
    }
  }
};

/**
 * The constructor for Couchbase connector
 *
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
class Couchbase extends NoSQL {

  /**
   * ID type.
   *
   * @param  {type} prop
   * @return {String}
   */
  getDefaultIdType(prop) {
    return String;
  }

  /**
   * Connect to Couchbase
   *
   * @param  {type} settings
   * @param  {type} database
   * @return {type}
   */
  _connect(settings, database) {
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
    // Cluster.
    this._cluster = Promise.resolve(new couchbase.Cluster(settings.cluster.url, settings.cluster.options))
      .then(utils.promisifyAllResolveWithReturn);
    // A connection is established when a bucket is open.
    // @see http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/performance-tuning.html
    return this._cluster.call('openBucketAsync', settings.bucket.name, settings.bucket.password)
      .then((bucket) => {
        if (settings.bucket.operationTimeout) {
          bucket.operationTimeout = settings.bucket.operationTimeout;
        }
        return bucket;
      })
      .then(Promise.promisifyAll);
  }

  /**
   * Disconnect from Couchbase
   *
   * @param  {type} bucket
   * @return {type}
   */
  _disconnect(bucket) {
    // Cleanup.
    this._cluster = null;
    this._manager = null;
    // Disconnect.
    return bucket.disconnect();
  }

  /**
   * Ping couchbase server.
   *
   * @param  {type} callback
   * @return {type}
   */
  ping(callback) {
    let promise;
    if (this._cluster == null) {
      promise = Promise.reject(new Error('not connected'));
    } else {
      promise = this.connect().call('getAsync', '1').return(true).catch(function(err) {
        if (err.message === 'The key does not exist on the server') {
          return true;
        }
        return Promise.reject(err);
      });
    }
    return promise.asCallback(callback);
  }

  /**
   * ViewQuery APIs.
   */

  /**
   * Shortcut.
   *
   * @param  {type} designDoc
   * @param  {type} viewName
   * @param  {type} options
   * @return {type}
   */
  view(designDoc, viewName, options) {
    return this.runViewQuery(this.newViewQuery(designDoc, viewName, options));
  }

  /**
   * Shortcut.
   *
   * @param  {type} query
   * @param  {type} params
   * @return {type}
   */
  runViewQuery(query, params) {
    return this.connect().call('queryAsync', query, params);
  }

  /**
   * Build a new view query.
   *
   * @see http://docs.couchbase.com/sdk-api/couchbase-node-client-2.1.2/ViewQuery.html
   * @param  {String} designDoc
   * @param  {String} viewName
   * @param  {Object} options
   * @return {Object}
   */
  newViewQuery(designDoc, viewName, options) {
    const ViewQuery = couchbase.ViewQuery;
    // With some defaults.
    let query = ViewQuery.from(designDoc, viewName)
      .on_error(ViewQuery.ErrorMode.STOP)
      .order(ViewQuery.Order.ASCENDING)
      .stale(ViewQuery.Update.BEFORE);

    if (options == null) {
      return query;
    }
    // The SDK made it easier for some options formats.
    // Call.
    [
      'stale', 'order', 'group', 'group_level', 'key', 'keys', 'include_docs', 'full_set', 'on_error', 'limit'
    ].forEach((key) => {
      if (options[key] != null) {
        query = query[key].call(query, options[key]);
        delete options[key];
      }
    });
    // Apply.
    ['range', 'id_range'].forEach((key) => {
      if (options[key] != null) {
        query = query[key].apply(query, options[key]);
        delete options[key];
      }
    });
    query = query.custom(options);
    return query;
  }

  /**
   * Bucket Manager APIs.
   */

  /**
   * You don't need to use this directly usually. Use the APIs below.
   *
   * @private
   */
  manager() {
    // Only one manager is needed.
    if (this._manager == null) {
      this._manager = this.connect().call('manager').then(Promise.promisifyAll);
    };
    return this._manager;
  }

  /**
   * Shortcut.
   *
   * @param  {type} name
   * @return {type}
   */
  getDesignDocument(name) {
    return this.manager().call('getDesignDocumentAsync', name);
  }

  /**
   * Shortcut.
   *
   * @return {type}
   */
  getDesignDocuments() {
    return this.manager().call('getDesignDocumentsAsync');
  }

  /**
   * Shortcut.
   *
   * @param  {type} name
   * @param  {type} data
   * @return {type}
   * */
  insertDesignDocument(name, data) {
    return this.manager().call('insertDesignDocumentAsync', name, data);
  }

  /**
   * Shortcut.
   *
   * @param  {type} name
   * @return {type}
   */
  removeDesignDocument(name) {
    return this.manager().call('removeDesignDocumentAsync', name);
  }

  /**
   * Shortcut.
   *
   * @param  {type} name
   * @param  {type} data
   * @return {type}
   */
  upsertDesignDocument(name, data) {
    return this.manager().call('upsertDesignDocumentAsync', name, data);
  }

  /**
   * Cluster Manager APIs.
   *
   * @param  {type} username
   * @param  {type} password
   * @return {type}
   */
  clusterManager(username, password) {
    // Only one manager is needed.
    if (this._clusterManager == null) {
      this._clusterManager = this._cluster.call('manager', username, password).then(Promise.promisifyAll);
    };
    return this._clusterManager;
  }

  /**
   * Operation hooks.
   */

  /**
   * Implement `autoupdate()`.
   *
   * @see `DataSource.prototype.autoupdate()`
   */
  autoupdate(models, callback) {
    debug('autoupdate', this.settings);
    // Create views.
    let designDocs = defaultDesignDocs;
    if (this.settings.designDocs) {
      designDocs = Object.assign({}, designDocs, this.settings.designDocs);
    }
    let promise = Promise.resolve(true);
    for (let name in designDocs) {
      promise = promise.then(() => {
        return this.upsertDesignDocument(name, designDocs[name]).then((res) => {
          debug('created design document', name, designDocs[name], res);
          return res;
        });
      });
    }
    return promise.asCallback(callback);
  }

  /**
   * Implement `automigrate()`.
   *
   * @see `DataSource.prototype.automigrate()`
   *
   * Not really useful. Usually we manage databases in other ways.
   */
  // automigrate(models, callback) {
  //   debug('automigrate', this.settings.database);
  // }

}

/**
 * Implement Accessor.
 */
class CouchbaseAccessor extends Accessor {

  /**
   * Save data to DB without a given id.
   *
   * @param  {type} data
   * @param  {type} options
   * @return {Promise}      Result is a promise with `[id, rev]` or an error.
   */
  postWithoutId(data, options) {
    // Generate ID.
    const id = uuid.v4();
    return this.postWithId(id, data, options);
  }

  /**
   * Save data to DB with a given id.
   *
   * @param  {type} id
   * @param  {type} data
   * @param  {type} options
   * @return {Promise}      Result is a promise with `[id, rev]` or an error.
   */
  postWithId(id, data, options) {
    // Result need to be `id` and `res`.
    return this.connection.call('insertAsync', id, data, options).then((res) => {
      return [id, res.cas];
    });
  }

  /**
   * Save data to DB with a given id.
   *
   * @param  {type} id
   * @param  {type} data
   * @param  {type} options
   * @return {Promise}      Result is a promise with `[id, rev]` or an error.
   */
  putWithId(id, data, options) {
    return this.connection.call('replaceAsync', id, data, options).then((res) => {
      return [id, res.cas];
    });
  }

  /**
   * Destroy data from DB by id.
   *
   * @param  {type} id
   * @param  {type} options
   * @return {Promise}      Result is a promise with whatever or an error.
   */
  destroyById(id, options) {
    return this.connection.call('removeAsync', id, options).return(true).catchReturn(false);
  }

  /**
   * Find data from DB by id.
   *
   * @param  {type} id
   * @param  {type} options
   * @return {Promise}      Result is a promise with the data or an error.
   */
  findById(id, options) {
    return this.connection.call('getAsync', id, options).then(this.unpackRes).then((data) => {
      if (data == null) {
        return Promise.reject(httpError(404));
      }
      return data;
    });
  }

  /**
   * Find all data from DB for a model.
   *
   * @param  {type} options
   * @return {Promise}      Result is a promise with an array of 0 to many `[id, data]`.
   */
  findAll(options) {
    return this.connector.view('connector', 'byModelName', {
      key: this.modelName
    }).map((res) => {
      return Promise.join(res.id, this.findById(res.id, options), (id, value) => {
        return [id, value];
      });
    });
  }

  /**
   * Convert data from model to DB format.
   *
   * @param  {type} data
   * @return {type}
   */
  forDb(data) {
    data = super.forDb(data);
    // Save the model name.
    data._type = this.modelName;
    return data;
  }

  /**
   * Convert data from DB format to model.
   *
   * @param  {type} data
   * @return {type}
   */
  fromDb(data) {
    data = super.fromDb(data);
    // Remove DB only data.
    if (data._type != null) {
      delete data._type;
    }
    return data;
  }

  /**
   * Helper.
   *
   * @param  {Object} data What the Bucket would return with the OpCallback()
   * @return {Promise}     The unpacked data
   */
  unpackRes(data) {
    // CAS is required.
    if (data == null || data.cas == null) {
      return Promise.resolve(null);
    }
    let unpacked = {};
    // Values are extracted to the top level.
    if (data.value != null) {
      Object.assign(unpacked, data.value);
    }
    unpacked._cas = data.cas;
    return Promise.resolve(unpacked);
  }

}

// Export initializer.
exports.initialize = NoSQL.initializer('couchbase3', Couchbase, CouchbaseAccessor);

// Export classes.
exports.Couchbase = Couchbase;
exports.CouchbaseAccessor = CouchbaseAccessor;
