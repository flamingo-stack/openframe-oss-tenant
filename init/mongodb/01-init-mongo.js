// Switch to admin database first
db = db.getSiblingDB('admin');

// Create root user if it doesn't exist
if (!db.getUser('openframe')) {
  db.createUser({
    user: 'openframe',
    pwd: 'password123456789',
    roles: [
      { role: 'root', db: 'admin' },
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' }
    ]
  });
}

// Switch to openframe database
db = db.getSiblingDB('openframe');

// Create collections
db.createCollection('users');
db.createCollection('devices');
db.createCollection('configurations');
