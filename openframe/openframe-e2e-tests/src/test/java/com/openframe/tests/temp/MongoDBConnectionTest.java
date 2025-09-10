package com.openframe.tests.temp;

import com.openframe.config.MongoDBConnection;
import com.openframe.config.ThreadSafeTestContext;
import com.openframe.tests.BaseTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import lombok.extern.slf4j.Slf4j;

/**
 * Temporary test for MongoDB connection and DBQuery validation
 */
@Slf4j
public class MongoDBConnectionTest extends BaseTest {

    private MongoDBConnection mongoConnection;

    @BeforeEach
    @Override
    protected void setupTest(TestInfo testInfo) {
        super.setupTest(testInfo);
        
        mongoConnection = MongoDBConnection.fromConfig();
        ThreadSafeTestContext.setData(ThreadSafeTestContext.MONGO_CONNECTION, mongoConnection);
        
        log.info("MongoDB connection initialized for test: {}", testInfo.getDisplayName());
    }

    @AfterEach
    @Override
    protected void cleanupTest(TestInfo testInfo) {

        if (mongoConnection != null) {
            mongoConnection.close();
            log.info("MongoDB connection closed for test: {}", testInfo.getDisplayName());
        }
        
        super.cleanupTest(testInfo);
    }

    @Test
    @DisplayName("Should connect to MongoDB successfully")
    void shouldConnectToMongoDBSuccessfully() {
        log.info("Testing MongoDB connection...");
        
        try {
            boolean connectionWorks = mongoConnection.isConnected();
            
            log.info("MongoDB connection test result: {}", connectionWorks);
            
            Assertions.assertTrue(connectionWorks, "Expected MongoDB connection to be successful");
                
        } catch (Exception e) {
            log.error("MongoDB connection failed: {}", e.getMessage());
            throw new AssertionError("MongoDB connection test failed: " + e.getMessage(), e);
        }
    }
}
