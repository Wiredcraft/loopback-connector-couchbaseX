// This test written in mocha
var should = require('./init.js');
var uuid = require('node-uuid');

describe('Couchbase CRUD', function() {

  var db;
  var connector;
  var Person;
  var persons;

  before(function(done) {
    db = getDataSource(null, done);
    connector = db.connector;
    Person = db.createModel('person', {
      id: {
        type: String,
        id: true
      },
      name: String,
      age: Number
    });
    persons = [{
      id: '1',
      name: 'Charlie',
      age: 24
    }, {
      id: '2',
      name: 'Mary',
      age: 24
    }, {
      id: '3',
      name: 'David',
      age: 24
    }, {
      name: 'Jason',
      age: 44
    }];
  });

  describe('Create', function() {
    after(function(done) {
      connector.manager().call('flushAsync').then(function() {
        done();
      }, done);
    });

    it('can create an instance with an id', function(done) {
      return Person.create(persons[0]).then(function(person) {
        person.id.should.equal('1');
        person.name.should.equal('Charlie');
        done();
      }).catch(done);
    });

    it('can create an instance without an id', function(done) {
      return Person.create(persons[3]).then(function(person) {
        person.id.should.be.String();
        person.name.should.equal('Jason');
        done();
      }).catch(done);
    });

    it('cannot create with a duplicate id ', function(done) {
      return Person.create(persons[0]).then(function() {
        done(new Error('expected an error'));
      }, function(err) {
        should.exist(err);
        done();
      });
    });

    // TODO: more errors
  });

  describe('Find by ID', function() {
    before(function(done) {
      Person.create(persons[0]).then(function() {
        done();
      }, done);
    });

    after(function(done) {
      connector.manager().call('flushAsync').then(function() {
        done();
      }, done);
    });

    it('can find a saved instance', function(done) {
      Person.findById('1').then(function(person) {
        person.should.be.Object();
        person.id.should.equal('1');
        person.name.should.equal('Charlie');
        person.age.should.equal(24);
        done();
      }).catch(done);
    });

    it('cannot find an unsaved instance', function(done) {
      Person.findById('2').then(function() {
        done(new Error('expected an error'));
      }, function(err) {
        should.exist(err);
        done();
      });
    });

    // TODO: more errors
  });

  describe('Destroy', function() {
    before(function(done) {
      Person.create(persons[0]).then(function() {
        done();
      }, done);
    });

    after(function(done) {
      connector.manager().call('flushAsync').then(function() {
        done();
      }, done);
    });

    it('can destroy a saved instance', function(done) {
      var person = Person(persons[0]);
      return person.remove().then(function(res) {
        res.should.be.Object().with.property('count', 1);
        done();
      }).catch(done);
    });

    it('cannot destroy an unsaved instance', function(done) {
      var person = Person(persons[2]);
      return person.remove().then(function() {
        done(new Error('expected an error'));
      }, function(err) {
        should.exist(err);
        done();
      });
    });

    // TODO: more errors
  });

  describe('Update or Create', function() {
    before(function(done) {
      Person.create(persons[0]).then(function() {
        done();
      }, done);
    });

    after(function(done) {
      connector.manager().call('flushAsync').then(function() {
        done();
      }, done);
    });

    it('can update an instance', function(done) {
      Person.updateOrCreate({
        id: '1',
        name: 'Charlie II',
        age: 24
      }).then(function(res) {
        res.should.be.Object();
        res.should.have.property('id', '1');
        res.should.have.property('name', 'Charlie II');
        res.should.have.property('age', 24);
        done();
      }).catch(done);
    });

    it('can create an instance', function(done) {
      Person.updateOrCreate(persons[1]).then(function(res) {
        res.should.be.Object();
        res.should.have.property('id', '2');
        res.should.have.property('name', 'Mary');
        res.should.have.property('age', 24);
        done();
      }).catch(done);
    });

    // TODO: more errors
  });

  describe('Save', function() {
    before(function(done) {
      Person.create(persons[0]).then(function() {
        done();
      }, done);
    });

    after(function(done) {
      connector.manager().call('flushAsync').then(function() {
        done();
      }, done);
    });

    it('can update an instance', function(done) {
      var person = Person.findById('1').then(function(person) {
        person.name = 'Charlie II';
        person.save().then(function(res) {
          res.should.be.Object();
          res.should.have.property('id', '1');
          res.should.have.property('name', 'Charlie II');
          res.should.have.property('age', 24);
          done();
        });
      }).catch(done);
    });

    it('can create an instance', function(done) {
      var person = Person(persons[1]);
      person.save().then(function(res) {
        res.should.be.Object();
        res.should.have.property('id', '2');
        res.should.have.property('name', 'Mary');
        res.should.have.property('age', 24);
        done();
      }).catch(done);
    });

    // TODO: more errors
  });

  describe('Find multiple', function() {});

  describe('Update multiple', function() {});

  describe('Destroy multiple', function() {});

});
