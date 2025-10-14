package com.openframe.tests.restapi;

import com.openframe.config.RestAssuredConfig;
import com.openframe.data.DBQuery;
import com.openframe.support.infrastructure.MongoDBTestInfrastructure;
import com.openframe.tests.BaseTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;

@Slf4j
public abstract class ApiBaseTest extends BaseTest {
    
    @BeforeAll
    static void setupTests() {
        log.info("Setting up API test environment");
        RestAssuredConfig.configure();

        // Eager initialization of MongoDB infrastructure for early connection verification
        // (Optional: DBQuery will auto-initialize if not done here)
        MongoDBTestInfrastructure.initialize();
        log.info("MongoDB infrastructure ready: {}", MongoDBTestInfrastructure.getConnectionInfo());
        
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
        
        // Clean test data after each test class
        if (MongoDBTestInfrastructure.isConnected()) {
            DBQuery.clearAllData();
            log.info("Test data cleared from MongoDB");
        }
        
        // NOTE: MongoDB connection is NOT closed here - it's shared across all test classes
        // Call MongoDBTestInfrastructure.cleanup() manually if needed for final cleanup
    }
}