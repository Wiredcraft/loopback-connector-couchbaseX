// This test written in mocha
var should = require('./init.js');
var db = getDataSource();

describe('Couchbase CRUD methods', function() {
  var Person = db.createModel('person', {id: {type: String, id: true}, name: String, age: Number});

  it('create', function(done) {
    Person.create({
      id: 'asd',
      name: 'Charlie',
      age: 370
    }, function(err, person) {
      person.age.should.equal(370);
      done(err, person);
    });
  });

});
