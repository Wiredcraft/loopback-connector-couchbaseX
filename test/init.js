module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;
var ModelBuilder = require('loopback-datasource-juggler').ModelBuilder;

function noop(err, res) {}

var config = require('rc')('loopback', {
  test: {
    couchbase: {

      //demo config
      cluster:{
        url:'couchbase://127.0.0.1',
        options:{}
      },
      bucket:{
        name:'default',
        password:''
      }

    }
  }
}).test.couchbase;

if (process.env.CI) {
  config = {
    // TODO

  };
}

global.getDataSource = global.getSchema = function(customConfig, callback) {
  if (callback == null) {
    callback = noop;
  }
  var builder = new ModelBuilder();
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
