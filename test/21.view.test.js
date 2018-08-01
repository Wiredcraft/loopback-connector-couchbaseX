'use strict';

const should = require('should');
const init = require('./init');
const flush = require('./flush');

describe('Couchbase Dynamic View Query', () => {

  let ds;
  let Person;
  let persons;
  const config = {
    cluster: {
      url: process.env.COUCHBASE_URL || 'couchbase://localhost',
      options: {}
    },
    bucket: {
      name: 'test_bucket',
      password: '',
      operationTimeout: 60 * 1000
    },
    experiment: ['viewQuery']
  };
  before(done => {
    init.getDataSource(config, (err, res) => {
      if (err) {
        return done(err);
      }
      ds = res;
      Person = ds.createModel('Person', {
        id: {
          type: String,
          id: true
        },
        name: String,
        age: Number
      });
      persons = [{
        id: '0',
        name: 'Charlie',
        age: 24,
        _type: 'Person'
      }, {
        id: '1',
        name: 'Mary',
        age: 24,
        _type: 'Person'
      }, {
        id: '2',
        name: 'David',
        age: 24,
        _type: 'Person'
      }, {
        name: 'Jason',
        age: 44,
        _type: 'Person'
      }];
      ds.autoupdate().then(() => {
        done();
      });
    });
  });

  after(done => {
    flush('test_bucket', done);
  });

  after(done => {
    ds.disconnect(done);
  });

  describe('Find by where', () => {

    before(done => {
      Person.create(persons, done);
    });

    after(done => {
      flush('test_bucket', done);
    });

    it('wait for 1 seconds', done => {
      setTimeout(done, 1000);
    });

    it('can find a saved instance', () => {
      return Person.find({ where: { name: 'Charlie' } }).then(([person]) => {
        should.exist(person);
        person.should.be.Object();
        person.id.should.equal('0');
        person.name.should.equal('Charlie');
        person.age.should.equal(24);
      });
    });

    it('can limit the return length', () => {
      return Person.find({ limit: 2 }).then(persons => {
        should.exist(persons);
        persons.length.should.equal(2);
      });
    });

    it('can find a saved instance by multipe filter', () => {
      return Person.find({ where: { name: 'Charlie', age: 24 } }).then(([person]) => {
        should.exist(person);
        person.should.be.Object();
        person.id.should.equal('0');
        person.name.should.equal('Charlie');
        person.age.should.equal(24);
      });
    });
  });
});
