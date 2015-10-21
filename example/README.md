### Preinstallation
* npm install loopback-connector-couchbase3 --save

### Define datasource
$ slc loopback:datasource

$ ? Enter the data-source name: YourDataSourceName

$ ? Select the connector for couchbase: other

$ ? Enter the connector name without the loopback-connector- prefix: couchbase3


### Modify datasource.json
1.Create a new bucket in your couchbase

2.In **server/datasource.json**

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
