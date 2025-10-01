package com.openframe.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static com.openframe.support.constants.DatabaseConstants.*;

public class MongoDBConnection {
    private static final Logger logger = LoggerFactory.getLogger(MongoDBConnection.class);
    private static MongoClient mongoClient;
    private static MongoDatabase database;

    public MongoDBConnection(String connectionString, String dbName) {
        mongoClient = MongoClients.create(connectionString);
        database = mongoClient.getDatabase(dbName);
        logger.info("Connected to MongoDB database: {}", dbName);
    }

    public static MongoDBConnection fromConfig() {
        return new MongoDBConnection(MONGODB_URI, DATABASE_NAME);
    }

    public MongoDatabase getDatabase() {
        return database;
    }

    public void close() {
        if (mongoClient != null) {
            mongoClient.close();
            logger.info("MongoDB connection closed");
        }
    }
}
