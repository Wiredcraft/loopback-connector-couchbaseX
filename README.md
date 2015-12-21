# loopback-connector-couchbase3

[![Build Status](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3.svg)](https://travis-ci.org/Wiredcraft/loopback-connector-couchbase3)

[![Coverage Status](https://coveralls.io/repos/Wiredcraft/loopback-connector-couchbase3/badge.svg?branch=master&service=github)](https://coveralls.io/github/Wiredcraft/loopback-connector-couchbase3?branch=master)

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

## Git Summary

```
 project  : loopback-connector-couchbase3
 repo age : 4 months
 active   : 33 days
 commits  : 67
 files    : 34
 authors  :
    33  Makara Wang        49.3%
    23  CCharlieLi         34.3%
     4  chopperlee         6.0%
     3  Leo Zhou           4.5%
     3  wwayne             4.5%
     1  greenkeeperio-bot  1.5%
```
