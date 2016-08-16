'use strict';

require('should');
var uuid = require('node-uuid');

var init = require('./init');

describe('Couchbase query methods', function() {

  var db;
  var connector;
  var Person;
  var person;

  before(function(done) {
    init.getDataSource(null, function(err, res) {
      if (err) {
        return done(err);
      }
      db = res;
      connector = db.connector;
      Person = db.createModel('person', {
        id: {
          type: String,
          id: true
        },
        name: String
      });
      person = {
        id: uuid.v4(),
        name: '_SpecialName'
      };
      done();
    });
  });

  before(function(done) {
    connector.upsertDesignDocument('dev_default', {
      views: {
        personName: {
          map: 'function(doc, meta) { emit(doc.name, doc); }'
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

  it('query should get result by view function', function(done) {
    connector.view('dev_default', 'personName', {
      key: '_SpecialName'
    }).then(function(res) {
      res.length.should.equal(1);
      done();
    }, done);
  });
});
