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

## Test

precheck: couchbase server is runing with two buckets named `test_bucket`, `test_ping` and enabled its flush feature.
run: `npm test`

## Git Summary

```
 project  : loopback-connector-couchbase3
 repo age : 4 months
 active   : 33 days
 commits  : 71
 files    : 34
 authors  :
    37  Makara Wang        52.1%
    23  CCharlieLi         32.4%
     4  chopperlee         5.6%
     3  Leo Zhou           4.2%
     3  wwayne             4.2%
     1  greenkeeperio-bot  1.4%
```
