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
    
    protected MongoDBConnection mongoConnection;
    
    @BeforeAll
    static void setupTests() {
        log.info("Setting up test environment");
        RestAssuredConfig.configure();
        log.info("Test environment ready");
    }
    
    @BeforeEach
    protected void setupTest(TestInfo testInfo) {
        super.setupTest(testInfo);
 
        mongoConnection = MongoDBConnection.fromConfig();
        ThreadSafeTestContext.setData(ThreadSafeTestContext.MONGO_CONNECTION, mongoConnection);
        log.info("MongoDB connection established for test: {}", testInfo.getDisplayName());
    }
    
    @AfterAll
    protected void cleanupAfterAllTests(TestInfo testInfo) {
        log.info("🧹 Cleaning up database after all tests...");
        DBQuery.clearAllData();
        if (mongoConnection != null) {
            mongoConnection.close();
            log.info("MongoDB connection closed for test: {}", testInfo.getDisplayName());
        }
    }
}