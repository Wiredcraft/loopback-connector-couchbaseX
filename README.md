# loopback-connector-couchbase3

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.


### Test

```bash
$ mocha test 
```

For detail information:

```bash
$ DEBUG=loopback:connector:couchbase3 mocha test 
```

### TODO

- Deploy ```Couchbase.prototype.count``` which is relied by ```Couchbase.prototype.exists```
- Deploy ```Couchbase.prototype.all``` which is relied by ```Couchbase.prototype.find```
