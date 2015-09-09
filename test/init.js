module.exports = require('should');

function noop(err, res) {}

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {test: {couchbase: {}}}).test.couchbase;

if (process.env.CI) {
  config = {
    // TODO
  };
}

global.getDataSource = global.getSchema = function(customConfig, callback) {
  if (callback == null) {
    callback = noop;
  }

  var db = new DataSource(require('../'), customConfig || config);
  db.log = function(a) {
    console.log(a);
  };

  db.on('connected', function() {
    callback(null, db);
  });

  db.on('error', callback);

  return db;
};

global.sinon = require('sinon');
