package com.openframe.support.infrastructure;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;

import static com.openframe.support.constants.DatabaseConstants.*;

/**
 * Shared MongoDB infrastructure for all test types
 * Thread-safe: MongoDB Java Driver uses connection pool internally
 * Auto-initializes on first use - no explicit setup required
 * 
 * Usage (Simple - works everywhere):
 * - Just call MongoDBTestInfrastructure.getDatabase() from any test
 * - Auto-initializes with default configuration on first use
 * - Used by DBQuery utility for database operations
 * 
 * Usage (Advanced - custom configuration):
 * - Call MongoDBTestInfrastructure.initialize(customUri, customDb) in test setup
 * - Call MongoDBTestInfrastructure.cleanup() for explicit cleanup (optional)
 * 
 * Works in: API tests, E2E tests, Integration tests, any test type
 */
@Slf4j
public class MongoDBTestInfrastructure {
    
    private static volatile MongoClient mongoClient;
    private static volatile MongoDatabase database;
    private static final Object lock = new Object();
    
    /**
     * Initialize MongoDB connection with default settings from DatabaseConstants
     * Thread-safe: uses synchronized block
     */
    public static void initialize() {
        initialize(MONGODB_URI, DATABASE_NAME);
    }
    
    /**
     * Initialize MongoDB connection with custom settings
     * Thread-safe: uses synchronized block
     * 
     * @param connectionString MongoDB connection string
     * @param databaseName Database name
     */
    public static void initialize(String connectionString, String databaseName) {
        synchronized (lock) {
            if (mongoClient == null) {
                log.info("Initializing MongoDB test infrastructure...");
                log.info("Connection: {}, Database: {}", 
                    connectionString.replaceAll("//.*@", "//*****@"), // Hide credentials
                    databaseName);
                
                mongoClient = MongoClients.create(connectionString);
                database = mongoClient.getDatabase(databaseName);
                
                // Verify connection
                try {
                    database.runCommand(new Document("ping", 1));
                    log.info("✅ MongoDB connection established");
                } catch (Exception e) {
                    log.error("❌ MongoDB connection failed", e);
                    throw new RuntimeException("Failed to connect to MongoDB", e);
                }
            }
        }
    }
    
    /**
     * Get MongoDB database instance
     * Thread-safe: Auto-initializes on first use with default configuration
     * Uses double-checked locking pattern with volatile field
     * 
     * @return MongoDatabase instance
     */
    public static MongoDatabase getDatabase() {
        MongoDatabase db = database; // Local copy for performance (volatile read)
        if (db == null) {
            synchronized (lock) {
                db = database; // Re-check inside synchronized block
                if (db == null) {
                    log.info("MongoDB not initialized - performing lazy initialization");
                    initialize(); // Auto-initialize with defaults
                    db = database;
                }
            }
        }
        return db;
    }
    
    /**
     * Check if MongoDB connection is active
     * Thread-safe: uses volatile field read and ping command
     * 
     * @return true if connected
     */
    public static boolean isConnected() {
        MongoDatabase db = database; // Volatile read
        if (db == null) {
            return false;
        }
        
        try {
            db.runCommand(new Document("ping", 1));
            return true;
        } catch (Exception e) {
            log.warn("MongoDB ping failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Cleanup MongoDB connection
     * Thread-safe: uses synchronized block
     */
    public static void cleanup() {
        synchronized (lock) {
            if (mongoClient != null) {
                try {
                    mongoClient.close();
                    log.info("MongoDB connection closed");
                } catch (Exception e) {
                    log.error("Error closing MongoDB connection", e);
                } finally {
                    mongoClient = null;
                    database = null;
                }
            }
        }
    }
    
    /**
     * Get connection details for logging/debugging
     * Thread-safe: uses volatile field read
     */
    public static String getConnectionInfo() {
        MongoDatabase db = database; // Volatile read
        if (db == null) {
            return "MongoDB: Not initialized";
        }
        return String.format("MongoDB: %s (connected: %s)", 
            db.getName(), 
            isConnected() ? "✅" : "❌");
    }
}

