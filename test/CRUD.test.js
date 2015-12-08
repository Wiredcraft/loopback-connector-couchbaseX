// This test written in mocha
var should = require('./init.js');
var uuid = require('node-uuid');

describe('Couchbase CRUD', function() {

  var db;
  var connector;
  var Person;
  var persons;

  before(function(done) {
    db = getDataSource({}, done);
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

  after(function(done) {
    connector.manager().call('flushAsync').then(function() {
      done();
    }, done);
  });

  describe('Couchbase CREATE TEST', function() {

    it('create should create new document with giving id', function(done) {
      return Person.create(persons[0]).then(function(person) {
        person.id.should.equal('1');
        person.name.should.equal('Charlie');
        done();
      }).catch(done);
    });

    it('create should create new document with giving id', function(done) {
      return Person.create(persons[1]).then(function(person) {
        person.id.should.equal('2');
        person.name.should.equal('Mary');
        done();
      }).catch(done);
    });

    it('create should create new document without giving id', function(done) {
      return Person.create(persons[3]).then(function(person) {
        person.id.should.be.String();
        person.name.should.equal('Jason');
        done();
      }).catch(done);
    });

    it('create error with existing id ', function(done) {
      return Person.create(persons[0]).then(function(res) {
        done(new Error('expected an error'));
      }, function(err) {
        should.exist(err);
        done();
      });
    });
  });

  describe('Couchbase SAVE TEST', function() {
    it('save/create one instace by its prototype method', function(done) {
      var person = Person(persons[2]);
      return person.save().then(function(person) {
        person.name.should.eql('David');
        done();
      }, done);
    });

    it('save/create one instace without giving id', function(done) {
      var person = Person(persons[3]);
      return person.save().then(function(person) {
        person.name.should.equal('Jason');
        done();
      }, done);
    });

    it('save a exist instace after changed', function(done) {
      return Person.findOne({
        where: {
          id: persons[2].id
        }
      }).then(function(person) {
        person.value.name.should.eql('David');
        person.value.name = 'Charlie';
        person.save().then(function(person) {
          person.value.name.should.eql('Charlie');
          done();
        });
      }, done);
    });

    it('save/create error with exist id', function(done) {
      var person = Person(persons[2]);
      return person.save().then().catch(function(err) {
        should.exist(err);
        done();
      });
    });
  });

  describe('Couchbase FIND TEST', function() {
    it('find should find a instance by a giving id', function(done) {
      return Person.find({
        where: {
          id: persons[0].id
        }
      }).then(function(person) {
        person[0].value.name.should.eql('Charlie');
        done();
      }, done);
    });

    it('findOne should find a instance by a giving id', function(done) {
      return Person.findOne({
        where: {
          id: persons[0].id
        }
      }).then(function(person) {
        person.value.name.should.eql('Charlie');
        done();
      }, done);
    });

    it('findById should find a instance by a giving id', function(done) {
      return Person.findById(persons[0].id).then(function(person) {
        person.value.name.should.eql('Charlie');
        done();
      }, done);
    });

    it('findByIds should find instances by giving ids', function(done) {
      return Person.findByIds([persons[0].id, persons[1].id]).then(function(person) {
        person[0][persons[0].id].value.name.should.eql('Charlie');
        person[0][persons[1].id].value.name.should.eql('Mary');
        done();
      }, done);
    });

    it('find error with a not exist id', function(done) {
      return Person.find({
        id: uuid.v4()
      }).then().catch(function(err) {
        should.exist(err);
        done();
      });
    });

    it('findById error with a not exist id', function(done) {
      return Person.findById(uuid.v4()).then().catch(function(err) {
        should.exist(err);
        done();
      });
    });
  });

  describe('Couchbase UPDATE TEST', function() {
    it('update should update a instance if it exist', function(done) {
      return Person.update({
        id: persons[0].id
      }, {
        age: 37
      }).then(function() {
        Person.findById(persons[0].id).then(function(person) {
          person.value.age.should.eql(37);
          done();
        });
      }, done);
    });

    it('update should create a exist instance if it not exist', function(done) {
      var newDocId = uuid.v4();
      return Person.updateOrCreate({
        id: newDocId,
        name: 'Henry'
      }).then(function() {
        Person.findById(newDocId).then(function(person) {
          person.value.name.should.eql('Henry');
          done();
        });
      }, done);
    });
  });

  describe('Couchbase DESTROY TEST', function() {
    it('remove one exist document with removeById()', function(done) {
      return Person.removeById(persons[0].id).then(function() {
        done();
      }, done);
    });

    it('remove one exist document with remove()', function(done) {
      return Person.remove({
        id: persons[1].id
      }).then(function() {
        done();
      }, done);
    });

    it('remove one instace by its prototype method', function(done) {
      var person = Person(persons[2]);
      return person.remove().then(function(person) {
        done();
      }, done);
    });

    it('remove error by its prototype method when instace doesn\'t exist', function(done) {
      var person = Person(persons[2]);
      return person.remove().then().catch(function(err) {
        should.exist(err);
        done();
      });
    });

    it('remove error when use remove() with unmatched documnet', function(done) {
      return Person.remove({
        id: uuid.v4()
      }).then().catch(function(err) {
        should.exist(err);
        done();
      });
    });

    it('remove error when use removeById() with unmatched documnet', function(done) {
      return Person.removeById(uuid.v4()).then().catch(function(err) {
        should.exist(err);
        done();
      });
    });
  });

});
