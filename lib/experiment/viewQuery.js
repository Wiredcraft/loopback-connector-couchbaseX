'use strict';

const Promise = require('bluebird');
const debug = require('debug')('loopback:connector:couchbase3:view');
const utils = require('../utils');
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
};

module.exports.Accessor = {

  findByFilters(filters, options) {
    var keys = Object.keys(filters);
    keys.sort();
    var name = utils.getViewName(keys);
    var params = [this.modelName];
    for (var i = 0; i < keys.length; i++) {
      params.push(filters[keys[i]]);
    }
    return this.connector.view('find', name, { key: params }).map((res) => {
      return Promise.join(res.id, this.findById(res.id, options), (id, value) => {
        return [id, value];
      });
    });;
  }
};

