'use strict';

var should = require('should');

var init = require('./init');

describe('Couchbase connector', function() {

  var db;
  var connector;

  after(function(done) {
    connector.manager().call('flushAsync').then(function() {
      done();
    }, done);
  });

  it('can connect.', function(done) {
    init.getDataSource(null, function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.Object();
      res.should.have.property('connected', true);
      res.should.have.property('connector').which.is.Object();
      db = res;
      connector = res.connector;
      done();
    });
  });

  it('can connect.', function(done) {
    connector.connect(function(err, res) {
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

  it('can disconnect.', function(done) {
    db.disconnect(done);
  });

  it('can disconnect.', function(done) {
    connector.disconnect(function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.equal(true);
      done();
    });
  });

  it('can connect twice the same time.', function(done) {
    connector.connect();
    connector.connect(done);
  });

  it('can disconnect twice the same time.', function(done) {
    connector.disconnect();
    connector.disconnect(done);
  });

  it('can connect and disconnect.', function(done) {
    connector.connect();
    connector.disconnect(done);
  });

  it('can connect.', function(done) {
    connector.connect(done);
  });

});

describe('Couchbase ping', function() {

  var db;
  var connector;

  before(function(done) {
    init.getDataSource(null, function(err, res) {
      if (err) {
        return done(err);
      }
      db = res;
      connector = db.connector;
      done();
    });
  });

  beforeEach(function(done) {
    connector.connect(done);
  });

  it('can do pingpong with promise style when connected', function(done) {
    connector.ping().then(function(res) {
      res.should.be.ok;
      done();
    }).catch(done);
  });

  it('can do pingpong with callback style when connected', function(done) {
    connector.ping(function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.ok;
      done();
    });
  });

  it('can not response ping with promise style when disconnected', function(done) {
    connector.disconnect(function(err, res) {
      connector.ping().then(function() {
        throw new Error('expected an error');
      }).catch(function(err) {
        should.exist(err);
        done();
      });
    });
  });

  it('can not response ping with callback style when disconnected', function(done) {
    connector.disconnect(function(err, res) {
      connector.ping(function(err, res) {
        should.exist(err);
        done();
      });
    });
  });

  it('can not response ping with when bucket connected but crashed', function(done) {
    this.timeout(50000);
    init.getDataSource({
      cluster: {
        url: 'couchbase://localhost',
        options: {}
      },
      bucket: {
        name: 'test_ping',
        password: ''
      }
    }, function(err, res) {
      var pingConnector = res.connector;
      pingConnector.connect();
      pingConnector.clusterManager(process.env.COUCHBASE_USER, process.env.COUCHBASE_PASS)
        .call('removeBucketAsync', 'test_ping').then(function() {
          pingConnector.ping(function(err, res) {
            should.exist(err);
            done();
          });
        }).catch(done);
    });
  });

});
