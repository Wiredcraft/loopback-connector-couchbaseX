'use strict';

// This test written in mocha
var should = require('./init.js');
var newId = require('node-uuid').v4();
var db;
var Person;
var person;

describe('Couchbase query methods', function() {

  before(function(done) {
    db = getDataSource();
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
    db.connector.upsertDesignDocument('dev_default', {
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
    Person.removeById(newId, done);
  });

  //QUERY TEST
  it('query should get result by view function', function(done) {
    db.connector.view('dev_default', 'personName', {
      key: '_SpecialName'
    }).then(function(res) {
      res.length.should.equal(1);
      done();
    }, done);
  });
});
