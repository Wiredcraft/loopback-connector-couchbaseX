"use strict";
var DataSource = require('loopback-datasource-juggler').DataSource;
var connector = require('..');
var Benchmark = require('benchmark');

//see: https://github.com/strongloop/loopback-connector-mongodb/blob/master/benchmarks/index.js
//db config
var config = require('rc')('loopback', {
  test: {
    couchbase: {
      cluster: {
        url: 'couchbase://127.0.0.1',
        options: {}
      },
      bucket: {
        name: 'default',
        password: ''
      }
    }
  }
}).test.couchbase;

var ds = new DataSource(connector, config);
var Todo = ds.createModel('Todo', {content: {type: String}});

var uniqVal = 0;

function resetTestState() {
  uniqVal = 0;
  //Todo.destroyAll();
}

var suite = new Benchmark.Suite;
suite
  .on('start', function () {
    console.log('#Begin ', new Date());
  })
  .add('create', {
    defer: true,
    fn: function (deferred) {
      Todo.create({content: 'Catch Pokemon ' + uniqVal, id: (uniqVal++)}, function () {
        deferred.resolve();
      });
    },
    onComplete: resetTestState
  })
  .add('find', {
    defer: true,
    fn: function (deferred) {
      Todo.find({id: (uniqVal++)}, function () {
        deferred.resolve();
      });
    },
    onComplete: resetTestState
  })
  .add('update', {
    defer: true,
    fn: function (deferred) {
      Todo.update({id: (uniqVal++)}, {content: 'Catch Pokemon ' + uniqVal}, function () {
        deferred.resolve();
      });
    },
    onComplete: resetTestState
  })
  .add('remove', {
    defer: true,
    fn: function (deferred) {
      Todo.remove({id: (uniqVal++)}, function () {
        deferred.resolve();
      });
    },
    onComplete: resetTestState
  })
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('#End ', new Date());
    //Todo.destroyAll();
    process.exit();
  })
  .run({async: true});