'use strict';

const should = require('should');

const init = require('./init');
const flush = require('./flush');

describe('Couchbase connector', () => {

  let ds;
  let connector;

  after((done) => {
    flush('test_bucket', done);
  });

  after((done) => {
    ds.disconnect(done);
  });

  it('can connect.', (done) => {
    init.getDataSource(null, (err, res) => {
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
    init.getDataSource(null, (err, res) => {
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

  it('can not response ping with when bucket connected but crashed', (done) => {
    let _ds;
    const disconnect = () => {
      _ds.disconnect(done);
    };
    init.getDataSource({
      cluster: {
        url: process.env.COUCHBASE_URL || 'couchbase://localhost',
        options: {}
      },
      bucket: {
        name: 'test_ping',
        password: ''
      }
    }, (err, res) => {
      if (err) {
        return done(err);
      }
      _ds = res;
      const pingConnector = res.connector;
      pingConnector.connect();
      pingConnector.clusterManager(process.env.COUCHBASE_USER, process.env.COUCHBASE_PASS)
        .call('removeBucketAsync', 'test_ping').then(() => {
          pingConnector.ping((err, res) => {
            should.exist(err);
            disconnect();
          });
        }).catch(disconnect);
    });
  });

});
