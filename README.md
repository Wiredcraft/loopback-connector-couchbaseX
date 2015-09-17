# loopback-connector-couchbase3

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.

### CRUD methods

- Insert

For document ```insert``` only, and will not update a existed one. If there is a document with same ID, a exception will be thrown.

- Find

Find document by given document ID.

- Update

Update a existed document by giving a document ID, or create a new one if there is no such a document.

- Remove

Remove document by given document ID.

### Test

```bash
$ mocha test 
```

For detail information:

```bash
$ DEBUG=loopback:connector:couchbase3 mocha test 
```

