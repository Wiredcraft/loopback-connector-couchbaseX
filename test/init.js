'use strict';

var Promise = require('bluebird');
var DataSource = require('loopback-datasource-juggler').DataSource;

var config = {
  cluster: {
    url: 'couchbase://localhost',
    options: {}
  },
  bucket: {
    name: 'test_bucket',
    password: ''
  }
};

exports.getDataSource = function (customConfig, callback) {
  var promise = new Promise(function (resolve, reject) {
    var db = new DataSource(require('../'), customConfig || config);
    db.log = function (a) {
      console.log(a);
    };
    db.on('connected', function () {
      resolve(db);
    });
    db.on('error', reject);
  });
  return promise.asCallback(callback);
};
