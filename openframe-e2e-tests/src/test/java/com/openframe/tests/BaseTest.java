package com.openframe.tests;

import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.AllureTestListener;
import com.openframe.config.ThreadSafeTestContext;
import com.openframe.support.utils.RetryExtension;
import io.qameta.allure.Allure;
import io.qameta.allure.Step;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.UUID;
import java.util.concurrent.Callable;

/**
 * Base class for all tests providing common functionality
 * Automatically captures test failures with stack traces via AllureTestListener
 */
@Slf4j
@ExtendWith(AllureTestListener.class)
@ExtendWith(RetryExtension.class)
public abstract class BaseTest {
    
    protected static final String RUN_ID = UUID.randomUUID().toString();
    protected String testId;
    protected String correlationId;
    
    @BeforeEach
    protected void setupTest(TestInfo testInfo) {
        testId = "test-" + RUN_ID + "-" + UUID.randomUUID().toString().substring(0, 8);
        correlationId = "corr-" + testId;
        
        log.info("Test: {} [testId={}]", testInfo.getDisplayName(), testId);
        Allure.epic("OpenFrame Tests");
        
        ThreadSafeTestContext.createUniqueUser("test_user");
    }

    @AfterEach
    protected void cleanupTest(TestInfo testInfo) {
        log.info("COMPLETED TEST: {} [testId={}]", testInfo.getDisplayName(), testId);
    }

    @AfterAll
    static void cleanupAfterAllTests() {
        ThreadSafeTestContext.cleanup();
        log.info("All tests completed, context cleaned up");
    }
    
    @Step("{phase}: {description}")
    protected <T> T executePhase(TestPhase phase, String description, Callable<T> action) {
        log.info("[{}] {}: {}", testId, phase, description);
        try {
            T result = action.call();
            return result;
        } catch (Exception e) {
            log.error("[{}] {} failed: {}", testId, phase, e.getMessage(), e);

            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            e.printStackTrace(pw);
            String fullStackTrace = sw.toString();

            String detailedMessage = String.format(
                "%s failed: %s%n" +
                "Test ID: %s%n" +
                "Error: %s: %s%n%n" +
                "%s",
                phase, description, testId,
                e.getClass().getSimpleName(), e.getMessage(),
                fullStackTrace
            );

            throw new AssertionError(detailedMessage, e);
        }
    }

    @Step("{phase}: {description}")
    protected void executePhase(TestPhase phase, String description, Runnable action) {
        executePhase(phase, description, () -> {
            action.run();
            return null;
        });
    }
}