'use strict';

var Promise = require('bluebird');
var DataSource = require('loopback-datasource-juggler').DataSource;

exports.config = {
  cluster: {
    url: process.env.COUCHBASE_URL || 'couchbase://localhost',
    username: 'Administrator',
    password: 'password',
    options: {}
  },
  bucket: {
    name: 'test_bucket',
    operationTimeout: 60 * 1000
  }
};

exports.getDataSource = function(customConfig, callback) {
  var promise = new Promise(function(resolve, reject) {
    var db = new DataSource(require('../'), customConfig || exports.config);
    db.log = function(a) {
      console.log(a);
    };
    db.on('connected', function() {
      resolve(db);
    });
    db.on('error', reject);
  });
  return promise.asCallback(callback);
};
