// Create root user in admin database
db = db.getSiblingDB('admin');

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

// Switch to openframe database and create collections
db = db.getSiblingDB('openframe');
db.createCollection('users');
db.createCollection('devices');
db.createCollection('configurations');
