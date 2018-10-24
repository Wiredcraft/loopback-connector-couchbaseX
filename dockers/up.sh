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

# Start the services and wait for it.
docker-compose up -d --build

STATUS=""
until [[ ${STATUS} = "healthy" ]]; do
    STATUS=`docker inspect --format='{{.State.Health.Status}}' couchbase`
    echo ${STATUS}
    sleep 5
done

# Initialize.
exec ./init.sh

popd
