'use strict';

const should = require('should');

const init = require('./init');
const flush = require('./flush');
console.log(111, process.env.COUCHBASE);
const config = process.env.COUCHBASE === 'cb5' ? {
  version: 5,
  cluster: {
    url: 'couchbase://localhost',
    username: 'Administrator',
    password: 'password',
    options: {}
  },
  bucket: {
    name: 'test_bucket',
    operationTimeout: 60 * 1000
  }
} : {
  version: 4,
  cluster: {
    url: 'couchbase://localhost',
    options: {}
  },
  bucket: {
    name: 'test_bucket',
    password: '',
    operationTimeout: 60 * 1000
  }
};

describe('Couchbase test', () => {
  describe('Couchbase connector', () => {
    let ds;
    let connector;
    after((done) => {
      flush(config, done);
    });
    after((done) => {
      ds.disconnect(done);
    });

    it('can connect.', (done) => {
      init.getDataSource(config, (err, res) => {
        if (err) {
          return done(err);
        }
        res.should.be.Object();
        res.should.have.property('connected', true);
        res.should.have.property('connector').which.is.Object();
        ds = res;
        connector = res.connector;
        done();
      });
    });

    it('can connect.', (done) => {
      connector.connect((err, res) => {
        if (err) {
          return done(err);
        }
        res.should.be.Object();
        res.should.have.property('connected', true);
        res.should.have.property('disconnect').which.is.Function();
        res.should.have.property('disconnectAsync').which.is.Function();
        done();
      });
    });

    it('can disconnect.', (done) => {
      ds.disconnect(done);
    });

    it('can disconnect.', (done) => {
      connector.disconnect((err, res) => {
        if (err) {
          return done(err);
        }
        res.should.equal(true);
        done();
      });
    });

    it('can connect twice the same time.', (done) => {
      connector.connect();
      connector.connect(done);
    });

    it('can disconnect twice the same time.', (done) => {
      connector.disconnect();
      connector.disconnect(done);
    });

    it('can connect and disconnect.', (done) => {
      connector.connect();
      connector.disconnect(done);
    });

    it('can connect.', (done) => {
      connector.connect(done);
    });
  });

  describe('Couchbase ping', () => {
    let ds;
    let connector;
    before((done) => {
      init.getDataSource(config, (err, res) => {
        if (err) {
          return done(err);
        }
        ds = res;
        connector = ds.connector;
        done();
      });
    });

    beforeEach((done) => {
      connector.connect(done);
    });

    after((done) => {
      ds.disconnect(done);
    });

    it('can do pingpong with promise style when connected', (done) => {
      connector.ping().then((res) => {
        res.should.be.ok;
        done();
      }).catch(done);
    });

    it('can do pingpong with callback style when connected', (done) => {
      connector.ping((err, res) => {
        if (err) {
          return done(err);
        }
        res.should.be.ok;
        done();
      });
    });

    it('can not response ping with promise style when disconnected', (done) => {
      connector.disconnect((err, res) => {
        connector.ping().then(() => {
          throw new Error('expected an error');
        }).catch((err) => {
          should.exist(err);
          done();
        });
      });
    });

    it('can not response ping with callback style when disconnected', (done) => {
      connector.disconnect((err, res) => {
        connector.ping((err, res) => {
          should.exist(err);
          done();
        });
      });
    });

    // one-time tesr
    it('can not response ping with when bucket connected but crashed', (done) => {
      let _ds;
      const disconnect = () => {
        _ds.disconnect(done);
      };
      init.getDataSource({
        version: 5,
        cluster: {
          url: 'couchbase://localhost',
          username: 'Administrator',
          password: 'password',
          options: {}
        },
        bucket: {
          name: 'test_ping',
          operationTimeout: 1000
        }
      }, (err, res) => {
        if (err) {
          return done(err);
        }
        _ds = res;
        const pingConnector = res.connector;
        pingConnector.connect();
        pingConnector.clusterManager('Administrator', 'password')
          .call('removeBucketAsync', 'test_ping').then(() => {
            pingConnector.ping((err, res) => {
              should.exist(err);
              disconnect();
            });
          }).catch(disconnect);
      });
    });
  });

  describe('Couchbase CRUD', () => {
    let ds;
    let Person;
    let persons;
    before((done) => {
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
          age: 24
        }, {
          name: 'Jason',
          age: 44
        }];
        done();
      });
    });
    before((done) => {
      ds.autoupdate(done);
    });
    after((done) => {
      flush(config, done);
    });
    after((done) => {
      ds.disconnect(done);
    });

    describe('Create', () => {
      after((done) => {
        flush(config, done);
      });

      it('can create an instance with an id', () => {
        return Person.create(persons[0]).then((person) => {
          person.id.should.equal('0');
          person.name.should.equal('Charlie');
        });
      });

      it('can create an instance without an id', () => {
        return Person.create(persons[3]).then((person) => {
          person.id.should.be.String();
          person.name.should.equal('Jason');
        });
      });

      it('cannot create with a duplicate id ', () => {
        return Person.create(persons[0]).then(() => {
          throw new Error('expected an error');
        }, (err) => {
          should.exist(err);
        });
      });

      // TODO: more errors
    });

    describe('Find by ID', () => {
      let id3;
      before(async() => {
        await Person.create(persons[0]);
        await Person.create(persons[3]).then((person) => {
          id3 = person.id;
        });
      });
      after((done) => {
        flush(config, done);
      });

      it('can find a saved instance', () => {
        return Person.findById('0').then((person) => {
          person.should.be.Object();
          person.id.should.equal('0');
          person.name.should.equal('Charlie');
          person.age.should.equal(24);
        });
      });

      it('can find a saved instance', () => {
        return Person.findById(id3).then((person) => {
          person.should.be.Object();
          person.id.should.equal(id3);
          person.name.should.equal('Jason');
          person.age.should.equal(44);
        });
      });

      it('cannot find an unsaved instance', () => {
        return Person.findById('1').then((res) => {
          should.not.exist(res);
        });
      });

      it('can disconnect', (done) => {
        ds.disconnect(done);
      });

      it('can connect', (done) => {
        ds.connect(done);
      });

      it('can find a saved instance', () => {
        return Person.findById('0').then((person) => {
          person.should.be.Object();
          person.id.should.equal('0');
          person.name.should.equal('Charlie');
          person.age.should.equal(24);
        });
      });

      // TODO: more errors
    });

    describe('Destroy', () => {
      before(async() => {
        await Person.create(persons[0]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can destroy a saved instance', () => {
        const person = Person(persons[0]);
        return person.remove().then((res) => {
          res.should.be.Object().with.property('count', 1);
        });
      });

      it('cannot destroy an unsaved instance', () => {
        const person = Person(persons[2]);
        return person.remove().then((res) => {
          res.should.be.Object().with.property('count', 0);
        });
      });

      // TODO: more errors
    });

    describe('Destroy by ID', () => {
      before(async() => {
        await Person.create(persons[0]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can destroy a saved instance', () => {
        return Person.destroyById('0').then((res) => {
          res.should.be.Object().with.property('count', 1);
        });
      });

      it('cannot destroy an unsaved instance', () => {
        return Person.destroyById('2').then((res) => {
          res.should.be.Object().with.property('count', 0);
        });
      });

      it('cannot destroy without giving id', () => {
        return Person.destroyById('').then(() => {
          throw new Error('expected an error');
        }, (err) => {
          should.exist(err);
        });
      });

      // TODO: more errors
    });

    describe('Update or Create', () => {
      before(async() => {
        await Person.create(persons[0]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can update an instance', () => {
        return Person.updateOrCreate({
          id: '0',
          name: 'Charlie II',
          age: 24
        }).then((res) => {
          res.should.be.Object();
          res.should.have.property('id', '0');
          res.should.have.property('name', 'Charlie II');
          res.should.have.property('age', 24);
        });
      });

      it('can create an instance', () => {
        return Person.updateOrCreate(persons[1]).then((res) => {
          res.should.be.Object();
          res.should.have.property('id', '1');
          res.should.have.property('name', 'Mary');
          res.should.have.property('age', 24);
        });
      });

      // TODO: more errors
    });

    describe('Save', () => {
      before(async() => {
        await Person.create(persons[0]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can update an instance', () => {
        return Person.findById('0').then((person) => {
          person.name = 'Charlie II';
          return person.save().then((res) => {
            res.should.be.Object();
            res.should.have.property('id', '0');
            res.should.have.property('name', 'Charlie II');
            res.should.have.property('age', 24);
          });
        });
      });

      it('can create an instance', () => {
        const person = Person(persons[1]);
        return person.save().then((res) => {
          res.should.be.Object();
          res.should.have.property('id', '1');
          res.should.have.property('name', 'Mary');
          res.should.have.property('age', 24);
        });
      });

      // TODO: more errors
    });

    describe('Destroy multiple', () => {
      before(() => {
        return Person.create(persons[0]);
      });
      before(() => {
        return Person.create(persons[1]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can remove 2 instances', () => {
        return Person.remove({
          id: {
            inq: ['0', '1']
          }
        }).then((res) => {
          res.should.be.Object().with.property('count', 2);
        });
      });

      it('cannot remove them again', () => {
        return Person.remove({
          id: {
            inq: ['0', '1']
          }
        }).then((res) => {
          res.should.be.Object().with.property('count', 0);
        });
      });

      it('can remove existed instance while cannot remove non-existed one', () => {
        return Person.create(persons[0]).then(() => {
          return Person.remove({
            id: {
              inq: ['0', '1']
            }
          }).then((res) => {
            res.should.be.Object().with.property('count', 1);
          });
        });
      });
    });

    describe('Find multiple', () => {
      before(async() => {
        await Person.create(persons[0]);
        await Person.create(persons[1]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can find 2 instances by id', () => {
        return Person.findByIds(['0', '1']).then((res) => {
          res.should.be.Array().with.length(2);
          res[0].should.have.property('id', '0');
          res[0].should.have.property('name', 'Charlie');
          res[1].should.have.property('id', '1');
          res[1].should.have.property('name', 'Mary');
        });
      });

      it('cannot find wrong instances by id', () => {
        return Person.findByIds(['0', 'lorem', '11111']).then((res) => {
          res.should.be.Array().with.length(1);
          res[0].should.have.property('name', 'Charlie');
        });
      });

      it('cannot find when giving a empty array of ids', () => {
        return Person.findByIds([]).then((res) => {
          res.should.be.Array().with.length(0);
        });
      });

      it('can find 2 instances', () => {
        return Person.find({
          where: {
            id: {
              inq: ['0', '1']
            }
          }
        }).then((res) => {
          res.should.be.Array().with.length(2);
          res[0].should.have.property('id', '0');
          res[0].should.have.property('name', 'Charlie');
          res[1].should.have.property('id', '1');
          res[1].should.have.property('name', 'Mary');
        });
      });

      it('cannot find wrong instances', () => {
        return Person.find({
          where: {
            id: {
              inq: ['0', 'lorem']
            }
          }
        }).then((res) => {
          res.should.be.Array().with.length(1);
          res[0].should.have.property('name', 'Charlie');
        });
      });

      it('can find empty when giving empty id array in inq', () => {
        setTimeout(() => {
          return Person.find({
            where: {
              id: {
                inq: []
              }
            }
          }).then((res) => {
            res.should.be.Array().with.length(0);
          });
        }, 5000);
      });

      it('can find empty when giving empty id object', () => {
        return Person.find({
          where: {
            id: {}
          }
        }).then((res) => {
          res.should.be.Array().with.length(0);
        });
      });

      it('can find when giving empty where object', () => {
        setTimeout(() => {
          return Person.find({
            where: {}
          }).then((res) => {
            res.should.be.Array().with.length(2);
          });
        }, 5000);
      });

      it('can find when giving empty query object', () => {
        setTimeout(() => {
          return Person.find({}).then((res) => {
            res.should.be.Array().with.length(2);
          });
        }, 5000);
      });

      it('can find when giving empty', () => {
        setTimeout(() => {
          return Person.find().then((res) => {
            res.should.be.Array().with.length(2);
          });
        }, 5000);
      });

      // TODO: more errors
    });
  });
});
