# loopback-connector-couchbaseX

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.

## How to use

### Install

```
npm install loopback-connector-couchbaseX --save
```

### Config

```
# datasources.json
{
  "testDs": {
    "name": "testDs",
    "connector": "couchbase5",
    "cluster": {
      "url": "couchbase://localhost",
      "username": "username",
      "password": "password",
      "options": {}
    },
    "bucket": {
      "name": "test_bucket"
    }
  }
}
```

## Dev

```
export COUCHBASE="couchbase5"
export COUCHBASE_USER="Administrator"
export COUCHBASE_PASS="password"
./dockers/start-couchbase.sh
```

## Test

precheck: couchbase server is runing with two buckets named `test_bucket`, `test_ping` and enabled its flush feature.
run: `npm test`
