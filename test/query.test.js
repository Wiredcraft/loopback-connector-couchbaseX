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
    Person = db.createModel('person', {id: {type: String, id: true}, name: String});
    person = {
      id: newId,
      name: '_SpecialName'
    };
    //create test document
    Person.create(person).then(function(person) {
      //create view
      var bmanager = db.connector.bucket.manager();
      bmanager.upsertDesignDocument('dev_default', {
        views: {
          personName: {
            map: function(doc, meta) {
              emit(doc.name, doc);
            }
          }
        }
      }, function(err) {
        if (err) {
          Person.remove({id: newId});
          console.log('ERROR', err);
          process.exit(0);
        }
        done();
      });
    });
  });

  //QUERY TEST
  it('query should get result by view function', function(done) {

    // todo-chopper: promise style is not working.
    //return db.connector.view('dev_default', 'personName','').then(function (res) {
    //  done();
    //}).catch(function (err) {
    //  done(err)
    //})
    return db.connector.view('dev_default', 'personName', '_SpecialName', function(err, res) {
      if (err) {
        Person.remove({id: newId});
        done(err);
      }
      res[0].length.should.equal(1);
      //remove test document
      Person.remove({id: newId});
      done();
    });
  });
});
