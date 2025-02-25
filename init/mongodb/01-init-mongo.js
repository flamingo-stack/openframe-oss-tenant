db = db.getSiblingDB('openframe');

// Create collections
db.createCollection('users');
db.createCollection('devices');
db.createCollection('configurations');

// Create application user with necessary permissions
db.createUser({
  user: 'openframe',
  pwd: 'password123456789',
  roles: [
    { role: 'readWrite', db: 'openframe' },
    { role: 'dbAdmin', db: 'openframe' }
  ]
});
