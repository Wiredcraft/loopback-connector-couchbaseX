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
Update on CB Authentication @https://docs.couchbase.com/java-sdk/current/sdk-authentication-overview.html
# datasources.json
{
  "testDs": {
    "name": "testDs",
    "connector": "couchbaseX",
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
    "connector": "couchbaseX",
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
