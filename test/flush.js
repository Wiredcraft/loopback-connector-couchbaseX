'use strict';

// Require some environment variables. Examples:
// export COUCHBASE_USER="Administrator"
// export COUCHBASE_PASS="password"

const Promise = require('bluebird');
const couchbase = require('couchbase');

const mapById = `function(doc, meta) {
  emit(doc.id, null);
}`;
const designDoc = {
  views: {
    byId: {
      map: mapById
    }
  }
};

module.exports = flush;

function flush(config, done) {
  const cluster = new couchbase.Cluster(config.cluster.url);
  try {
    if (config.cluster.username && config.cluster.password) {
      cluster.authenticate(config.cluster.username, config.cluster.password);
    }
  } catch (e) {}
  const bucket = cluster.openBucket(config.bucket.name, (err) => {
    if (err) {
      return done(err);
    }
    const manager = bucket.manager();
    Promise.promisifyAll(manager);
    Promise.promisifyAll(bucket);
    manager.upsertDesignDocumentAsync('test', designDoc).then(() => {
      return bucket.queryAsync(couchbase.ViewQuery.from('test', 'byId').on_error(2).order(1).stale(1));
    }).map((row) => {
      return bucket.removeAsync(row.id);
    }).asCallback(done);
  });
}
