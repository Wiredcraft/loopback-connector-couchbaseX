var should = require('./init.js');

describe('Couchbase connector', function () {

  var db;
  var connector;

  after(function (done) {
    connector.manager().call('flushAsync').then(function () {
      done();
    }, done);
  });

  it('can connect.', function (done) {
    db = getDataSource(null, function (err, res) {
      if (err) return done(err);
      res.should.be.type('object');
      res.should.have.property('connected', true);
      res.should.have.property('connector').with.type('object');
      connector = res.connector;
      done();
    });
  });

  it('can connect.', function (done) {
    connector.connect(function (err, res) {
      if (err) return done(err);
      res.should.be.type('object');
      res.should.have.property('connected', true);
      res.should.have.property('disconnect').with.type('function');
      res.should.have.property('disconnectAsync').with.type('function');
      done();
    });
  });

  it('can disconnect.', function (done) {
    db.disconnect(done);
  });

  it('can disconnect.', function (done) {
    connector.disconnect(function (err, res) {
      if (err) return done(err);
      res.should.equal(true);
      done();
    });
  });

  it('can connect twice the same time.', function (done) {
    connector.connect();
    connector.connect(done);
  });

  it('can disconnect twice the same time.', function (done) {
    connector.disconnect();
    connector.disconnect(done);
  });

  it('can connect and disconnect.', function (done) {
    connector.connect();
    connector.disconnect(done);
  });

  it('can do pingpong with promise style when connected', function (done) {
    db = getDataSource(null, function (err, res) {
      if (err) return done(err);
      connector = res.connector;
      connector.connect();
      connector.ping()
        .then(function (res) {
          res.should.be.ok;
          done();
        }).catch(done);
    });
  });

  it('can do pingpong with callback style when connected', function (done) {
    db = getDataSource(null, function (err, res) {
      if (err) return done(err);
      connector = res.connector;
      connector.connect();
      connector.ping(function (err, res) {
        if (err) done(err);
        res.should.be.ok;
        done();
      });
    });
  });

  it('can not response ping when disconnected', function (done) {
    connector.disconnect(function (err, res) {
      connector.ping()
        .catch(done());
    });
  });
});
