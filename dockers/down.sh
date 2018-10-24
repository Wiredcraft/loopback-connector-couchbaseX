#!/bin/bash
set -ev

# Environment variables.
NODE_ENV=${NODE_ENV:-development}
COUCHBASE=${COUCHBASE:-couchbase5}
COUCHBASE_USER=${COUCHBASE_USER:-Administrator}
COUCHBASE_PASS=${COUCHBASE_PASS:-password}

pushd `dirname $0`
DIR=`pwd`
popd

pushd ${DIR}/${COUCHBASE}
docker-compose down
popd
