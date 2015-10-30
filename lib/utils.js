'use strict';

var Promise = require('bluebird');

/**
 * A special `promisifyAll`. The `openBucket()` method (in class `Cluster`) has
 * both a return which is the bucket, and a callback which is the error.
 * @param  {Object} target
 * @return {Object}
 */
exports.promisifyAllResolveWithReturn = function promisifyAllResolveWithReturn(target) {
  return Promise.promisifyAll(target, {
    promisifier: promisifier
  });
};

/**
 * Helper.
 * @param  {Function} originalMethod
 * @return {Function}
 */
function promisifier(originalMethod) {
  return function promisified() {
    var self = this;
    var args = [].slice.call(arguments);
    return new Promise(function(resolve, reject) {
      var res;
      args.push(function(err) {
        if (err) return reject(err);
        resolve(res);
      });
      res = originalMethod.apply(self, args);
    });
  };
}
