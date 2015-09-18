// This test written in mocha
var should = require('./init.js');
var assert = require('assert');
var db = getDataSource();

describe('Couchbase CRUD methods', function() {
  var Person = db.createModel('person', {id: {type: String, id: true}, name: String, age: Number});

  it('create', function(done) {
    Person.create({
      id: '1',
      name: 'Charlie',
      age: 24
    }, function(err, person) {
      person.age.should.equal(24);
      done(err, person);
    });
  });

  it('find', function(done) {
    Person.find({id: '1'}, function(err, person) {
      person.name.should.equal('Charlie');
      done(err, person);
    });
  });

  it('update', function(done) {
    Person.update({
      id: '1'
    },{
      id: '1',
      name: 'Mary',
      age: 37
    }, function(err, res) {
      assert.equal(res, true);
      done(err, res);
    });
  });

  // it('destroy', function(done) {
  //   Person.remove({
  //     id: '1'
  //   },function(err, res) {
  //     assert.equal(res, true);
  //     done(err, res);
  //   });
  // });

  // it('count', function(done) {
  //   Person.count({id: 'asd'}, function(err, person) {
  //     console.log(err);
  //     console.log(JSON.stringify(person));//person.name.should.equal('Charlie');
  //     done(err, person);
  //   });
  // });

  // it('exists', function(done) {
  //   Person.exists('asd', function(err, person) {
  //     console.log(err);
  //     person.name.should.equal('Charlie');
  //     done(err, person);
  //   });
  // });

  



});
