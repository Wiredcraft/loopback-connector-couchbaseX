### Preinstallation
* npm install loopback-connector-couchbase3 --save

### Define datasource
1. $ slc loopback:datasource
2. Choose **Other** when `Select the connector`

### Define datasource.json
in server/datasource.json

```
 "yourDatasourceName": {
    "name": "yourDatasourceName",
    "connector": "couchbase3",
    "cluster": {
      "url": "localhost"
    },
    "bucket": {
      "name": "yourBucketName",
      "password": ""
    }
  }
```
