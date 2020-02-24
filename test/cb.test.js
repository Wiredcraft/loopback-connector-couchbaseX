'use strict';

const should = require('should');

const init = require('./init');
const flush = require('./flush');
const config = process.env.COUCHBASE === 'cb4' ? {
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
} : {
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

    it('can get connector.', (done) => {
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

    it('can disconnect with ds.', (done) => {
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

    it('can connect again', (done) => {
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
    it.skip('can not response ping with when bucket connected but crashed', (done) => {
      let _ds;
      const disconnect = () => {
        _ds.disconnect(done);
      };
      const config2 = process.env.COUCHBASE === 'cb4'
        ? Object.assign({}, config, { bucket: {
          name: 'test_ping',
          password: ''
        } }) : Object.assign({}, config, { bucket: {
          name: 'test_ping',
          operationTimeout: 1000
        } });
      init.getDataSource(config2, (err, res) => {
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

      // TODO: more errors
    });

    describe('Find by view', () => {
      before(async() => {
        await Person.getConnector().autoupdate();
        await Person.create(persons[0]);
        await Person.create(persons[3]);
      });
      after((done) => {
        flush(config, done);
      });

      it('can find a saved instance', () => {
        return Person.getConnector().view('connector', 'byModelName', { key: 'person', stale: 1 })
          .then((res) => {
            res.length.should.be.equal(2);
            res.forEach(each => {
              each.id.should.be.ok;
              each.key.should.be.ok;
            });
          });
      });

      it('can find with limit option', () => {
        return Person.getConnector().view('connector', 'byModelName', { key: 'person', limit: 1, stale: 1 })
          .then((res) => {
            res.length.should.be.equal(1);
            res.forEach(each => {
              each.id.should.be.ok;
              each.key.should.be.ok;
            });
          });
      });

      it('can find with limit and skip option', async() => {
        const firstQuery = await Person.getConnector().view('connector', 'byModelName', {
          key: 'person', limit: 1, skip: 0, stale: 1
        });
        const secondQuery = await Person.getConnector().view('connector', 'byModelName', {
          key: 'person', limit: 1, skip: 1, stale: 1
        });
        firstQuery.length.should.be.equal(1);
        secondQuery.length.should.be.equal(1);
        firstQuery[0].id.should.not.be.equal(secondQuery[0].id);
      });

      it('cannot find an unsaved instance', () => {
        return Person.getConnector().view('connector', 'byModelName', { key: 'Person', limit: 1, stale: 1 })
          .then((res) => {
            res.length.should.be.equal(0);
          });
      });

      it('can disconnect', (done) => {
        ds.disconnect(done);
      });

      it('can connect', (done) => {
        ds.connect(done);
      });

      it('can find a list', () => {
        return Person.getConnector().view('connector', 'byModelName', { key: 'person', stale: 1 })
          .then((res) => {
            res.length.should.be.equal(2);
            res.forEach(each => {
              each.id.should.be.ok;
              each.key.should.be.ok;
            });
          });
      });

      it('can keep options unchanged', () => {
        let options = { key: 'person', stale: 1 };
        return Person.getConnector().view('connector', 'byModelName', options)
          .then((res) => {
            res.length.should.be.equal(2);
            options.should.eql({ key: 'person', stale: 1 });
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

      it('update and creat should filter _cas', async() => {
        const record = {
          id: '0',
          name: 'Charlie II',
          age: 24,
          _cas: 'somethings'
        };
        await Person.destroyById(record.id);
        await Person.create(record);
        const connection = await Person.getConnector()._connection;
        const { value } = await connection.getAsync(record.id);
        value.should.have.property('name', record.name);
        value.should.not.have.property('_cas');
        await Person.update({ id: record.id }, record);
        const result = await connection.getAsync(record.id);
        const currentValue = result.value;
        currentValue.should.have.property('name', record.name);
        currentValue.should.not.have.property('_cas');
        const people = await Person.findById(record.id);
        people.should.be.Object();
        people.should.have.property('_cas').which.is.Object();
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
          res[0].should.have.key('_cas');
          res[0].should.have.property('name', 'Charlie');
          res[1].should.have.property('id', '1');
          res[1].should.have.property('name', 'Mary');
          res[1].should.have.key('_cas');
        });
      });

      it('cannot find wrong instances by id', () => {
        return Person.findByIds(['0', 'lorem', '11111']).then((res) => {
          res.should.be.Array().with.length(1);
          res[0].should.have.property('name', 'Charlie');
        });
      });

      it('findById and findByIds will return object and array', async() => {
        const res = await Person.findByIds(['0']);
        res.should.be.Array().with.length(1);
        const record = await Person.findById('0');
        record.should.be.Object().has.key('_cas');
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
        return Person.find({
          where: {
            id: {
              inq: []
            }
          }
        }).then((res) => {
          res.should.be.Array().with.length(0);
        });
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
        return Person.find({
          where: {}
        }, { stale: 1 }).then((res) => {
          res.should.be.Array().with.length(2);
          res[0].should.be.has.key('_cas');
          res[1]['_cas'].should.be.ok();
        });
      });
      it('can find when giving empty', () => {
        return Person.find(null, { state: 1 }).then((res) => {
          res.should.be.Array().with.length(2);
        });
      });

      // TODO: more errors
    });

    describe('Couchbase setting', () => {
      let config;
      let Pet;
      it('can global setting view stale', () => {
        const config = process.env.COUCHBASE === 'cb4' ? {
          version: 4,
          cluster: {
            url: 'couchbase://localhost',
            options: {}
          },
          stale: 1,
          bucket: {
            name: 'test_bucket',
            password: '',
            operationTimeout: 60 * 1000
          }
        } : {
          version: 5,
          cluster: {
            url: 'couchbase://localhost',
            username: 'Administrator',
            password: 'password',
            options: {}
          },
          stale: 1,
          bucket: {
            name: 'test_bucket',
            operationTimeout: 60 * 1000
          }
        };
        let Pet;
        const pets = [{
          id: '0',
          name: 'Lucy',
          age: 1
        }, {
          id: '1',
          name: 'Coco',
          age: 2
        }];
        return init.getDataSource(config)
          .then(res => {
            ds = res;
            Pet = ds.createModel('pet', {
              id: {
                type: String,
                id: true
              },
              name: String,
              age: Number
            });
            return Promise.all([Pet.create(pets[0]), Pet.create(pets[1])]);
          })
          .then(() => Pet.getConnector().view('connector', 'byModelName', { key: 'pet' }))
          .then((res) => res.should.be.Array().with.length(2));
      });
    });
  });
});
