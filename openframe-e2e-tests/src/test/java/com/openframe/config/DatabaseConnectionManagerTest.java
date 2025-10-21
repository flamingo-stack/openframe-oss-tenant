package com.openframe.config;

import com.mongodb.client.MongoDatabase;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class to verify DatabaseConnectionManager functionality
 */
@Slf4j
public class DatabaseConnectionManagerTest {

    @Test
    @DisplayName("Should initialize connection when not available")
    void shouldInitializeConnectionWhenNotAvailable() {
        // Reset connection to ensure clean state
        DatabaseConnectionManager.resetConnection();
        
        // Verify connection is not available initially
        assertFalse(DatabaseConnectionManager.isConnectionAvailable());
        
        // Initialize connection
        DatabaseConnectionManager.initializeIfNeeded();
        
        // Verify connection is now available
        assertTrue(DatabaseConnectionManager.isConnectionAvailable());
        
        // Verify database access works
        MongoDatabase database = DatabaseConnectionManager.getDatabase();
        assertNotNull(database);
        assertNotNull(database.getName());
        
        log.info("Database connection test passed - connected to: {}", database.getName());
    }

    @Test
    @DisplayName("Should reuse existing connection")
    void shouldReuseExistingConnection() {
        // Initialize connection
        DatabaseConnectionManager.initializeIfNeeded();
        assertTrue(DatabaseConnectionManager.isConnectionAvailable());
        
        // Get connection multiple times - should be the same instance
        MongoDatabase db1 = DatabaseConnectionManager.getDatabase();
        MongoDatabase db2 = DatabaseConnectionManager.getDatabase();
        
        // Should be the same database instance (connection pooling)
        assertEquals(db1.getName(), db2.getName());
        
        log.info("Connection reuse test passed");
    }

    @AfterEach
    void cleanup() {
        // Clean up after each test
        DatabaseConnectionManager.resetConnection();
    }
}
