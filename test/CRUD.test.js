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
    }, function(err, res) {
      if(err) console.log(err);
      //console.log(res);
      res.age.should.eql(24);
      res.name.should.eql('Charlie');
      done(err, res);
    });
  });

  it('find', function(done) {
    Person.find({id: '1'}, function(err, res) {
      if(err) console.log(err);
      //console.log(res);
      res.value.age.should.eql(24);
      res.value.name.should.eql('Charlie');
      done(err, res);
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
      if(err) console.log(err);
      //console.log(res);
      done(err, res);
    });
  });

  it('destroy', function(done) {
    Person.remove({
      id: '1'
    },function(err, res) {
      if(err) console.log(err);
      //console.log(res);
      done(err, res);
    });
  });

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
