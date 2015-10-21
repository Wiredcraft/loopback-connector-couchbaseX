var path = require('path')
var connectorCouchbase3 = require(path.resolve('../index'))
var DataSource = require('loopback-datasource-juggler').DataSource

module.exports = function connectCouchbase (server) {

  /*  Create datasource by the connector `loopback-connecter-couchbase3`
   *  Pre: create a new bucket named 'test' in couchbase
   */
  var beerDataSource = new DataSource({
    connector: connectorCouchbase3,
    cluster: {
      url: 'localhost'
    },
    bucket: {
      name: 'test',
      password: ''
    }
  })

  /* Define the Beer model by this datasource
   *
   */
  server.model('Beer', {
    dataSource: beerDataSource,
    properties: {
      name: String,
      alcohol: String,
      origin: String
    }
  })
}
