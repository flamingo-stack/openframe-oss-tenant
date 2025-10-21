package com.openframe.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import lombok.extern.slf4j.Slf4j;

/**
 * Centralized database connection manager for test framework
 * Provides thread-safe access to MongoDB connections across different test contexts
 */
@Slf4j
public class DatabaseConnectionManager {
    
    private static volatile MongoDBConnection connection;
    private static final Object lock = new Object();
    
    /**
     * Get or create MongoDB connection
     * Thread-safe singleton pattern with double-checked locking
     */
    public static MongoDBConnection getConnection() {
        if (connection == null) {
            synchronized (lock) {
                if (connection == null) {
                    connection = MongoDBConnection.fromConfig();
                    log.info("MongoDB connection initialized by DatabaseConnectionManager");
                }
            }
        }
        return connection;
    }
    
    /**
     * Get MongoDB database instance
     * Thread-safe: MongoDB Java Driver connection pool handles concurrency
     */
    public static MongoDatabase getDatabase() {
        return getConnection().getDatabase();
    }
    
    /**
     * Check if connection is available
     */
    public static boolean isConnectionAvailable() {
        return connection != null;
    }
    
    /**
     * Reset connection (for testing purposes)
     */
    public static void resetConnection() {
        synchronized (lock) {
            if (connection != null) {
                connection.close();
                connection = null;
                log.info("MongoDB connection reset");
            }
        }
    }
    
    /**
     * Initialize connection if not already done
     * This method can be called from any test context
     */
    public static void initializeIfNeeded() {
        if (!isConnectionAvailable()) {
            getConnection();
        }
    }
}
