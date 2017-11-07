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
 repo age : 2 years, 2 months
 active   : 53 days
 commits  : 106
 files    : 38
 authors  :
    59  Makara Wang        55.7%
    25  CCharlieLi         23.6%
     7  chopperlee         6.6%
     4  Xavier Zhou        3.8%
     3  Leo Zhou           2.8%
     3  wwayne             2.8%
     2  greenkeeperio-bot  1.9%
     2  xavier             1.9%
     1  Marc Bachmann      0.9%
```
