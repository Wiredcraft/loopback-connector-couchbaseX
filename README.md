# loopback-connector-couchbaseX

[![Build Status](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3.svg?branch=master)](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3)
[![Coverage Status](https://coveralls.io/repos/github/Wiredcraft/loopback-connector-couchbase3/badge.svg?branch=master)](https://coveralls.io/github/Wiredcraft/loopback-connector-couchbase3?branch=master)

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.

## How to use


### Install

```
npm install loopback-connector-couchbasex --save
```

### Caveat

- Model's function `update` play the same role as `updateAttributes` which cause by `loopback-datasource-juggler`.

`PUT` and `PATCH` both do the same thing that merge incoming data with current record.

 ```
 update = Object.assign(current, incoming)
 ```

Discussion of `update` and `updateAttribetes` , see: [https://groups.google.com/forum/#!topic/loopbackjs/-1jarvOuh8k](https://groups.google.com/forum/#!topic/loopbackjs/-1jarvOuh8k)

- since version 1.0.0 the default vaule of  `stale` was set to `ok` in viewQuery.

If the update key is not `id`, you must set `stale=before` in `options` parameter to make sure you get the correct data to merge incoming data, like:

```
const where = { name: 'kitten' };
const update = { ...data };
options = { stale: before };
SomeModel.update(where, update, options);
```

About **[stale](https://docs.couchbase.com/server/6.5/learn/views/views-operation.html#index-stale)**


### DataSource Config in LoopBack

- For Couchbase version >= 5, as default
```
Update on CB Authentication @https://docs.couchbase.com/java-sdk/current/sdk-authentication-overview.html
# datasources.json
{
  "testDs": {
    "name": "testDs",
    "connector": "couchbasex",
    "version": 5,
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
    "connector": "couchbasex",
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

```
# Docker Up
./dockers/up.sh cb4
or
./dockers/up.sh cb5
./dockers/up.sh cb6

# Run Test
yarn run cb4
or
yarn run cb5
yarn run cb6

# Docker Down
./dockers/down.sh cb4
or
./dockers/down.sh cb5
./dockers/down.sh cb6
```




## Summary
```
project  : loopback-connector-couchbase3
repo age : 4 years, 1 month
active   : 61 days
commits  : 124
files    : 27

authors  :
  63  Makara Wang        50.8%
  39  CCharlieLi         31.5%
   7  chopperlee         5.6%
   4  Xavier Zhou        3.2%
   3  Leo Zhou           2.4%
   3  wwayne             2.4%
   2  greenkeeperio-bot  1.6%
   2  xavier             1.6%
   1  Marc Bachmann      0.8%
```
