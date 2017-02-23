# loopback-connector-couchbase3

[![Build Status](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3.svg)](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3) [![Coverage Status](https://coveralls.io/repos/Wiredcraft/loopback-connector-couchbase3/badge.svg?branch=master&service=github)](https://coveralls.io/github/Wiredcraft/loopback-connector-couchbase3?branch=master)

This is a Couchbase connector node module for [Loopback](http://loopback.io/) with [loopback-datasource-juggler](https://github.com/strongloop/loopback-datasource-juggler). Without N1QL for now.

## How to use

### Install

```
npm install loopback-connector-couchbase3 --save
```

### Config

```
# datasources.json
{
  "couchbaseTestBucket": {
    "name": "couchbaseTestBucket",
    "connector": "couchbase3",
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

## Dev

```
export COUCHBASE="couchbase3"
export COUCHBASE_USER="Administrator"
export COUCHBASE_PASS="password"
./dockers/start-couchbase.sh
```

## Test

precheck: couchbase server is runing with two buckets named `test_bucket`, `test_ping` and enabled its flush feature.
run: `npm test`

## Git Summary

```
 project  : loopback-connector-couchbase3
 repo age : 5 months
 active   : 38 days
 commits  : 78
 files    : 34
 authors  :
    41  Makara Wang        52.6%
    23  CCharlieLi         29.5%
     7  chopperlee         9.0%
     3  Leo Zhou           3.8%
     3  wwayne             3.8%
     1  greenkeeperio-bot  1.3%
```
