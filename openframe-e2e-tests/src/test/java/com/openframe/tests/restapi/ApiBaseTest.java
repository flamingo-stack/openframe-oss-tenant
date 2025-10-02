package com.openframe.tests.restapi;

import com.openframe.config.RestAssuredConfig;
import com.openframe.config.MongoDBConnection;
import com.openframe.config.ThreadSafeTestContext;
import com.openframe.data.DBQuery;
import com.openframe.tests.BaseTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;

@Slf4j
public abstract class ApiBaseTest extends BaseTest {
    
    // Shared MongoDB connection for all API tests (thread-safe via MongoDB Driver connection pool)
    private static MongoDBConnection mongoConnection;
    
    /**
     * Get shared MongoDB connection for API tests
     * Thread-safe: MongoDB Java Driver handles connection pooling internally
     */
    public static MongoDBConnection getMongoConnection() {
        if (mongoConnection == null) {
            throw new IllegalStateException("MongoDB connection not initialized. Ensure @BeforeAll setupTests() was called.");
        }
        return mongoConnection;
    }
    
    @BeforeAll
    static void setupTests() {
        log.info("Setting up API test environment");
        RestAssuredConfig.configure();

        // Initialize MongoDB connection once for all API test classes
        if (mongoConnection == null) {
            mongoConnection = MongoDBConnection.fromConfig();
            log.info("MongoDB connection established (shared across all API test classes)");
        } else {
            log.info("MongoDB connection already initialized (reusing existing connection)");
        }
        
        log.info("Test environment ready");
    }
    
    @BeforeEach
    protected void setupTest(TestInfo testInfo) {
        super.setupTest(testInfo);
        log.info("Test started: {}", testInfo.getDisplayName());
    }
    
    @AfterAll
    static void cleanupApiTests() {
        log.info("Cleaning up API test resources for current test class");
        if (mongoConnection != null) {
            DBQuery.clearAllData();
            log.info("Test data cleared from MongoDB");
        }
        // NOTE: MongoDB connection is NOT closed here - it's shared across all API test classes
        // JUnit will call BaseTest.cleanupAfterAllTests() automatically to clean ThreadLocal context
    }
}