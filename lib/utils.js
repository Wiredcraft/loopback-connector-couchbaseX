'use strict';

var Promise = require('bluebird');

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

exports.objToArr = function(res) {
  return Object.keys(res)
    .filter(k => {
      return !(res[k].error);
    })
    .map(id => [id, unpackRes(res[id])]);
};

const unpackRes = exports.unpackRes = data => {
  if (!data || !data.cas) {
    return null;
  }

  return Object.assign({ _cas: data.cas }, data.value);
};
