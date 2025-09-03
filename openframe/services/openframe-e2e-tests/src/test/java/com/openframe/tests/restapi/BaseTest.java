package com.openframe.tests.restapi;

import com.openframe.config.RestAssuredConfig;
import com.openframe.core.ThreadSafeTestContext;
import com.openframe.config.DatabaseConnection;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;


@Slf4j
@Execution(ExecutionMode.CONCURRENT)
public abstract class BaseTest {
    @BeforeAll
    static void setupTests() {
        log.info("Setting up test environment");
        RestAssuredConfig.configure();
        log.info("Test environment ready");
    }
    
    @AfterAll
    static void cleanupAfterAllTests() {
        log.info("🧹 Cleaning up database after all tests...");
    }
    
    @BeforeEach
    void setupTest(TestInfo testInfo) {
        String testName = testInfo.getDisplayName();
        String testClass = testInfo.getTestClass()
            .map(Class::getSimpleName)
            .orElse("Unknown");
        
        log.info("🚀 STARTING TEST: {} in {}", testName, testClass);
        ThreadSafeTestContext.createUniqueUser("test_user");
    }
    
    @AfterEach
    void cleanupTest(TestInfo testInfo) {
        String testName = testInfo.getDisplayName();
        String testClass = testInfo.getTestClass()
            .map(Class::getSimpleName)
            .orElse("Unknown");
            
        ThreadSafeTestContext.cleanup();
        log.info("COMPLETED TEST: {} in {}", testName, testClass);
    }
}