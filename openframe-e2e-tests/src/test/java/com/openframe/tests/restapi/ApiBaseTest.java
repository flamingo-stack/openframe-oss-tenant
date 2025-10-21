package com.openframe.tests.restapi;

import com.openframe.config.RestAssuredConfig;
import com.openframe.config.DatabaseConnectionManager;
import com.openframe.config.ThreadSafeTestContext;
import com.openframe.data.DBQuery;
import com.openframe.tests.BaseTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;

@Slf4j
public abstract class ApiBaseTest extends BaseTest {
    
    @BeforeAll
    static void setupTests() {
        log.info("Setting up API test environment");
        RestAssuredConfig.configure();

        // Initialize database connection through centralized manager
        DatabaseConnectionManager.initializeIfNeeded();
        log.info("Database connection available for API tests");
        
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
        if (DatabaseConnectionManager.isConnectionAvailable()) {
            DBQuery.clearAllData();
            log.info("Test data cleared from MongoDB");
        }
    }
}