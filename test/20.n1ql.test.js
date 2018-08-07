'use strict';

const should = require('should');
const init = require('./init');
const flush = require('./flush');

describe('Couchbase N1QL Query', function() {
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
    experiment: ['n1ql']
  };

  before('Not Supported for CouchBase 3', function(done) {
    if (process.env.COUCHBASE === 'couchbase3') {
      return this.skip();
    } else {
      init.getDataSource(config, (err, res) => {
        if (err) {
          return done(err);
        }
        ds = res;
        Person = ds.createModel('person', {
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
          age: 24
        }, {
          id: '1',
          name: 'Mary',
          age: 24
        }, {
          id: '2',
          name: 'David',
          age: 34
        }, {
          name: 'Jason',
          age: 44
        }];
        ds.autoupdate().then(() => {
          Person.create(persons, done);
        });
      });
    }
  });

  after(done => {
    flush('test_bucket', done);
  });

  after(function(done) {
    if (process.env.COUCHBASE === 'couchbase3') {
      return this.skip();
    } else {
      ds.disconnect(done);
    }
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

  it('can skip the return', () => {
    return Person.find({ skip: 3 }).then(persons => {
      should.exist(persons);
      persons.length.should.equal(1);
    });
  });

  it('can order by age asc', () => {
    return Person.find({ order: 'age ASC' }).then(persons => {
      should.exist(persons);
      persons[0].age.should.equal(24);
      persons[3].age.should.equal(44);
      persons.length.should.equal(4);
    });
  });

  it('can order by age desc', () => {
    return Person.find({ order: 'age DESC' }).then(persons => {
      should.exist(persons);
      persons[3].age.should.equal(24);
      persons[0].age.should.equal(44);
      persons.length.should.equal(4);
    });
  });

  it('can order by age and name desc', () => {
    return Person.find({ order: ['age DESC', 'name DESC'] }).then(persons => {
      should.exist(persons);
      persons[3].age.should.equal(24);
      persons[0].age.should.equal(44);
      persons[1].name.should.equal('David');
      persons.length.should.equal(4);
    });
  });

  it('can get some person name like Cha%', () => {
    return Person.find({ where: { name: { like: 'Cha%' } } }).then(persons => {
      persons.length.should.equal(1);
      should.exist(persons);
      persons[0].name.should.equal('Charlie');
    });
  });

  it('can get some person name not like Cha%', () => {
    return Person.find({ where: { name: { nlike: 'Cha%' } } }).then(persons => {
      persons.length.should.equal(3);
      should.exist(persons);
      persons[0].name.should.not.equal('Charlie');
      persons[1].name.should.not.equal('Charlie');
      persons[2].name.should.not.equal('Charlie');
    });
  });

  it('can pattern match via regular expression, /^C+.*/', () => {
    return Person.find({ where: { name: { regexp: /^C+.*/ } } }).then(persons => {
      persons.length.should.equal(1);
      should.exist(persons);
      persons[0].name.should.equal('Charlie');
    });
  });

  it('can pattern match via regular expression string, ^C+.*', () => {
    return Person.find({ where: { name: { regexp: '^C+.*' } } }).then(persons => {
      persons.length.should.equal(1);
      should.exist(persons);
      persons[0].name.should.equal('Charlie');
    });
  });

  it('can range query, 30 < name < 50', () => {
    return Person.find({ where: { age: { gt: 30, lt: 50 } }, order: 'age DESC' }).then(persons => {
      persons.length.should.equal(2);
      should.exist(persons);
      persons[0].name.should.equal('Jason');
      persons[1].name.should.equal('David');
    });
  });

  it('can find all person who age is not 24', () => {
    return Person.find({ where: { age: { neq: 44 } } }).then(persons => {
      persons.length.should.equal(3);
      should.exist(persons);
      persons[0].age.should.not.equal(44);
      persons[1].age.should.not.equal(44);
      persons[2].age.should.not.equal(44);
    });
  });

  it('can filter by complex AND & OR condition', () => {
    return Person.find(
      { where: {
          and: [
            { age: { gt: 10 } },
            { age: { lt: 40 } }],
          or: [
            { name: 'Charlie' },
            { name: 'Mary' }]
        },
        order: 'name ASC' })
        .then(persons => {
      should.exist(persons);
      persons.length.should.equal(3);
      persons[0].name.should.equal('Charlie');
      persons[1].name.should.equal('David');
      persons[2].name.should.equal('Mary');
    });
  });
  it('only show specific fields', () => {
    return Person.find({ fields: { name: true, age: false }, limit: 1 }).then(([person]) => {
      should.exist(person);
      should.exist(person.name);
      should.not.exist(person.age);
    });
  });
});
