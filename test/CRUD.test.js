// This test written in mocha
var should = require('./init.js');
var uuid = require('node-uuid');
var db;
var Person;
var persons;

describe('Couchbase CRUD methods', function() {
  before(function(done) {
    db = getDataSource();
    Person = db.createModel('person', {id: {type: String, id: true}, name: String, age: Number});
    persons = [
      {
        id: '1',
        name: 'Charlie',
        age: 24
      },
      {
        id: '2',
        name: 'Mary',
        age: 24
      },
      {
        name: 'Jason',
        age: 44
      }
    ];
    done();
  });

  //CREATE TEST
  it('create should create new document with giving id', function(done) {
    return Person.create(persons[0]).then(function(person) {
      person.name.should.equal('Charlie');
      Person.create(persons[1]).then(function(person) {
        person.name.should.equal('Mary');
        done();
      });
    }).catch(function(err) {
      done(err);
    });
  });

  it('create should create new document without giving id', function(done) {
    return Person.create(persons[2]).then(function(person) {
      person.name.should.equal('Jason');
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('create error with exist id ', function(done) {
    return Person.create(persons[0]).then().catch(function(err) {
      should.exist(err);
      done();
    });
  });

  //FIND TEST
  it('find should find a instance by a giving id', function(done) {
    return Person.findById(persons[0].id).then(function(person) {
      person.value.name.should.eql('Charlie');
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('find should find instances by giving ids', function(done) {
    return Person.findByIds([persons[0].id, persons[1].id]).then(function(person) {
      person[0][persons[0].id].value.name.should.eql('Charlie');
      person[0][persons[1].id].value.name.should.eql('Mary');
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  // it('find should find a instance (filter)', function(done) {
  //   return Person.find({where:{age:24}}).then(function(person) {
  //     person[0].value.name.should.eql('Charlie');
  //     done();
  //   }).catch(function(err) {
  //     done(err);
  //   });
  // });

  it('find error with a not exist id', function(done) {
    return Person.findById(uuid.v4()).then().catch(function(err) {
      should.exist(err);
      done();
    });
  });

  //UPDATE TEST
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
    }).catch(function(err) {
      done(err);
    });
  });

  it('update should create a exist instance if it not exist', function(done) {
    var newDocId = uuid.v4();
    return Person.update({
      id: newDocId
    }, {
      name: 'Henry'
    }).then(function() {
      Person.findById(newDocId).then(function(person) {
        person.value.name.should.eql('Henry');
        done();
      });
    }).catch(function(err) {
      done(err);
    });
  });

  //DESTROY TEST
  it('remove one exist document by id', function(done) {
    return Person.removeById(persons[0].id).then(function() {
      Person.removeById(persons[1].id).then(function() {
        done();
      });
    }).catch(function(err) {
      done(err);
    });
  });

  // it('remove one exist document(where)', function(done) {
  //  return Person.remove({name: 'Jason'}).then(function() {
  //    done();
  //  }).catch(function(err) {
  //    done(err);
  //  });
  // });

  it('destroy error when unmatched documnet', function(done) {
    return Person.remove({id: uuid.v4()}).then().catch(function(err) {
      should.exist(err);
      done();
    });
  });

});
