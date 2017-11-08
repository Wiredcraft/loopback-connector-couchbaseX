
0.5.0 / 2017-11-08
==================

  * Refactored docker boxes.
  * Upgrade modules.

0.4.0 / 2017-02-23
==================

  * Updated modules which fixed a problem with reconnect to DB.
  * chore(package): update uuid to version 3.0.0

0.3.1 / 2016-11-01
==================

  * Smaller view but slower find.
  * Added a test helper that flushes data by removing all data which is faster than a real flush.
  * Use `docker-compose` to manage the test boxes.

0.3.0 / 2016-08-16
==================

  * Reimplemented based on `loopback-connector-nosql` and now all the hooks should return things as `loopback-datasource-juggler` expects.
  * Updated modules and coding styles.
  * update find/multiFind, destroy/multiDestroy to return array/count instead of throwing a error when instance does not exist
  * update couchbase to 2.2.1
  * Improved styles for the tests.
  * Improved some coding style.
  * chore(package): update es6-shim to version 0.35.0
  * Use env var for Couchbase user and pass.
  * Updated JSCS and other packages.

0.2.2 / 2016-02-01
==================

  * add clusterManager() method and test case for bucket crashed
  * add ping method
  * Satisfy JSCS 2.9.
  * Fixed coding styles.

0.2.1 / 2015-12-30
==================

  * Fixed that the generated ID wasn't set back to model instance.
  * Update README.md
  * Setting up coveralls.io

0.2.0 / 2015-12-17
==================

  * Reviewed all CRUD methods, but disabled bulk operations for now.
  * Fix Node 0.12 doesn't have a proper `Object.assign()` with es6-shim.
  * Reviewed CRUD for all the single instance operations.
  * CI doesn't need a special config.
  * Changed test bucket name.
  * Fixed the create hook and use CAS as rev.
  * Update dependencies.
  * Resorted functions and put the bulk operations together.
  * Save a `_type` with the doc which is the model name.
  * Removed some debugs that would slow it down.
  * Simpler way of getting a container ip.

0.1.0 / 2015-11-10
==================

  * Small tweaks, for how we use promise etc.
  * divide tests in separate describe
  * Add tests for save() and destroy()
  * update updateOrCreate() method and find() test
  * Setting up Travis.
  * API change: rebuilt view API and it now only uses promise (dropped callback).
  * Added bucket manager API.
  * Rebuilt connect() and disconnect().
  * Implemented updateOrCreate(), save(), destroy(). Reviewed create().
  * Update example

0.0.1 / 2015-10-20
==================

* First release.
