// Switch to admin database
db = db.getSiblingDB('admin');

// Create root user if it doesn't exist
if (!db.getUser(process.env.MONGO_INITDB_ROOT_USERNAME)) {
  db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
    roles: [
      { role: 'root', db: 'admin' },
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' }
    ]
  });
}

// Switch to openframe database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'openframe');

// Create collections if they don't exist
if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users');
}
if (!db.getCollectionNames().includes('devices')) {
  db.createCollection('devices');
}
if (!db.getCollectionNames().includes('configurations')) {
  db.createCollection('configurations');
}
