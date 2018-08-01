'use strict';

const Promise = require('bluebird');
const debug = require('debug')('loopback:connector:couchbase3:view');
const utils = require('../utils');
const notEmptyObject = require('not-empty-object').notEmptyObject;
module.exports.Couchbase = {
  /**
   * Implement `autoupdate()`.
   *
   * @see `DataSource.prototype.autoupdate()`
   */
  autoupdate(models, callback) {
    debug('autoupdate', this.settings);
    const views = utils.generateViews(models);
    // Create views.
    let designDocs = this.defaultDesignDocs;
    if (this.settings.designDocs) {
      designDocs = Object.assign({}, designDocs, this.settings.designDocs);
    }
    Object.assign(designDocs, views);
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
  },

  /**
   * Monkey Patch
   * @see `DataAccessObject.find()`
   */
  all(modelName, query, options, callback) {
    // Clone query.
    query = Object.assign({}, query || {});
    const ids = this.getIdsFromWhere(modelName, query.where);
    // Result must be an array.
    let promise;
    if (notEmptyObject(ids)) {
      promise = this.findByIds(modelName, ids, options);
    } else {
      promise = this.findByFilters(modelName, query, options);
    }
    return promise.asCallback(callback);
  }
};

module.exports.Accessor = {

  findByFilters(filters, options) {
    var params = this.modelName;
    var doc = 'connector';
    var name = 'byModelName';
    if (filters.where) {
      params = [params];
      doc = 'query';
      var keys = Object.keys(filters.where);
      keys.sort();
      name = utils.getViewName(keys);
      for (var i = 0; i < keys.length; i++) {
        params.push(filters.where[keys[i]]);
      }
    }
    var critera = { key: params };
    if (filters.limit) {
      var limit = parseInt(filters.limit);
      if (isNaN(limit) && limit < 0) {
        throw new Error('invalid parameter: limit');
      }
      critera.limit = limit;
    }
    if (filters.skip) {
      var skip = parseInt(filters.skip);
      if (isNaN(skip) && skip < 0) {
        throw new Error('invalid parameter: skip');
      }
      critera.skip = skip;
    }
    return this.connector.view(doc, name, critera).map((res) => {
      return Promise.join(res.id, this.findById(res.id, options), (id, value) => {
        return [id, value];
      });
    });;
  }
};

