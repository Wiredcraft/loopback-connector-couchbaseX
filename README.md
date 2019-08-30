# loopback-connector-couchbaseX

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.

## How to use

### Install

```
npm install loopback-connector-couchbaseX --save
```

### DataSource Config in LoopBack

- For Couchbase version >= 5, as default
```
# datasources.json
{
  "testDs": {
    "name": "testDs",
    "connector": "couchbase5",
    "version": 5,  // optional
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

- For Couchbase version < 5
```
# datasources.json
{
  "testDs": {
    "name": "testDs",
    "connector": "couchbase5",
    "version": 3,
    "cluster": {
      "url": "couchbase://localhost",
      "options": {}
    },
    "bucket": {
      "name": "test_bucket",
      "password": ""
    }
  }
}
```

## Test

`yarn test`

## Summary

project  : loopback-connector-couchbaseX
repo age : 4 years
active   : 57 days
commits  : 112
files    : 40
authors  :
   63  Makara Wang        56.2%
   27  CCharlieLi         24.1%
    7  chopperlee         6.2%
    4  Xavier Zhou        3.6%
    3  Leo Zhou           2.7%
    3  wwayne             2.7%
    2  greenkeeperio-bot  1.8%
    2  xavier             1.8%
    1  Marc Bachmann      0.9%
