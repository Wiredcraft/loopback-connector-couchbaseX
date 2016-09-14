#!/bin/bash
set -ev

# Require some environment variables. Examples:
# export COUCHBASE="couchbase3"
# export COUCHBASE_USER="Administrator"
# export COUCHBASE_PASS="password"

function try() {
  [[ $- = *e* ]]; SAVED_OPT_E=$?
  set +e
}

function catch() {
  export ex_code=$?
  (( $SAVED_OPT_E )) && set +e
  return $ex_code
}

pushd `dirname $0`
DIR=`pwd`
popd

pushd ${DIR}/${COUCHBASE}

# Start the services and wait for it.
docker-compose up -d --build
while true; do
  try
  (
    docker-compose run --rm --entrypoint=/opt/couchbase/bin/couchbase-cli couchbase \
      server-info -c couchbase:8091 -u $COUCHBASE_USER -p $COUCHBASE_PASS
  )
  catch || {
    sleep 3
    continue
  }
  break
done

# Initialize.
exec ./init.sh

popd
