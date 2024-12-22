db = db.getSiblingDB('openframe');

db.createUser({
    user: "openframe",
    pwd: "password123456789",
    roles: [{ role: "readWrite", db: "openframe" }]
  });

// Create collections
db.createCollection('events');

// Insert sample events
db.events.insertMany([
    {
        id: "evt-001",
        type: "USER_ACTION",
        payload: JSON.stringify({
            action: "LOGIN",
            userId: "user-123",
            timestamp: new Date()
        }),
        timestamp: new Date(),
        userId: "user-123"
    },
    {
        id: "evt-002",
        type: "SYSTEM_EVENT",
        payload: JSON.stringify({
            action: "BACKUP_COMPLETED",
            status: "SUCCESS",
            timestamp: new Date()
        }),
        timestamp: new Date(),
        userId: "system"
    }
]);

// Create indexes
db.events.createIndex({ "userId": 1, "timestamp": -1 });
db.events.createIndex({ "type": 1 });
