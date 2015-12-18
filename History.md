
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
