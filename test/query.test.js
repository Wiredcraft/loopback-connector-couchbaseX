'use strict';

// This test written in mocha
var should = require('./init.js');
var newId = require('node-uuid').v4();

describe('Couchbase query methods', function() {

  var db;
  var connector;
  var Person;
  var person;

  before(function(done) {
    db = getDataSource(null, done);
    connector = db.connector;
    Person = db.createModel('person', {
      id: {
        type: String,
        id: true
      },
      name: String
    });
    person = {
      id: newId,
      name: '_SpecialName'
    };
  });

  before(function(done) {
    connector.upsertDesignDocument('dev_default', {
      views: {
        personName: {
          map: function(doc, meta) {
            emit(doc.name, doc);
          }
        }
      }
    }).then(function() {
      Person.create(person, done);
    }, done);
  });

  after(function(done) {
    connector.manager().call('flushAsync').then(function() {
      done();
    }, done);
  });

  //QUERY TEST
  it('query should get result by view function', function(done) {
    connector.view('dev_default', 'personName', {
      key: '_SpecialName'
    }).then(function(res) {
      res.length.should.equal(1);
      done();
    }, done);
  });
});
