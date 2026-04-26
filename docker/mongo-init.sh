#!/bin/bash
set -euo pipefail

mongosh "mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/admin?directConnection=true&authSource=admin" <<EOF
try {
  rs.status();
} catch (error) {
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
  });
}

let isPrimary = false;

for (let attempt = 0; attempt < 30; attempt += 1) {
  if (db.hello().isWritablePrimary) {
    isPrimary = true;
    break;
  }

  sleep(1000);
}

if (!isPrimary) {
  throw new Error("Replica set primary election did not complete in time.");
}

db = db.getSiblingDB("${LOCAL_MONGODB_DATABASE}");

if (!db.getUser("${LOCAL_MONGODB_APP_USERNAME}")) {
  db.createUser({
    user: "${LOCAL_MONGODB_APP_USERNAME}",
    pwd: "${LOCAL_MONGODB_APP_PASSWORD}",
    roles: [{ role: "readWrite", db: "${LOCAL_MONGODB_DATABASE}" }]
  });
}
EOF
