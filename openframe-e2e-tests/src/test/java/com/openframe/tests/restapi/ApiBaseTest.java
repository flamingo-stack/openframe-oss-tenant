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
    
    protected static MongoDBConnection mongoConnection;
    
    @BeforeAll
    static void setupTests() {
        log.info("Setting up test environment");
        RestAssuredConfig.configure();
        
        // Створюємо одне з'єднання для всього класу
        mongoConnection = MongoDBConnection.fromConfig();
        ThreadSafeTestContext.setData(ThreadSafeTestContext.MONGO_CONNECTION, mongoConnection);
        log.info("MongoDB connection established for all tests");
        log.info("Test environment ready");
    }
    
    @BeforeEach
    protected void setupTest(TestInfo testInfo) {
        super.setupTest(testInfo);
        // З'єднання вже створене в @BeforeAll
        log.info("Test started: {}", testInfo.getDisplayName());
    }
    
    @AfterAll
    static void cleanupAfterAllTests() {
        log.info("🧹 Cleaning up database after all tests...");
        if (mongoConnection != null) {
            DBQuery.clearAllData();
            mongoConnection.close();
            log.info("MongoDB connection closed for all tests");
        } else {
            log.info("No MongoDB connection to cleanup (no tests were executed)");
        }
    }
}