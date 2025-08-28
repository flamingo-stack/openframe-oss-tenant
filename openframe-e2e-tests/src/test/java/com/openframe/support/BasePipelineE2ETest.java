package com.openframe.support;

import io.qameta.allure.Allure;
import io.qameta.allure.Step;
import lombok.extern.slf4j.Slf4j;
import org.awaitility.core.ThrowingRunnable;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;

import org.awaitility.Awaitility;

@Slf4j
public abstract class BasePipelineE2ETest {

    protected static final Duration EVENTUAL_CONSISTENCY = Duration.ofSeconds(30);
    protected static final Duration PIPELINE_TIMEOUT = Duration.ofSeconds(60);
    
    protected static final String RUN_ID = UUID.randomUUID().toString();
    protected static final String API_SERVICE_URL = "http://openframe-api.microservices.svc.cluster.local:8090";
    protected static final String CLIENT_SERVICE_URL = "http://openframe-client.microservices.svc.cluster.local:8097";
    protected static final String GATEWAY_URL = "http://openframe-gateway.microservices.svc.cluster.local:8080";
    
    protected String testId;
    protected String correlationId;
    
    @BeforeAll
    static void initSuite() {
        log.info("E2E Test Suite initialized with RunID: {}", RUN_ID);
        Awaitility.setDefaultTimeout(60, TimeUnit.SECONDS);
        Awaitility.setDefaultPollInterval(1, TimeUnit.SECONDS);
    }

    protected enum TestPhase {
        ARRANGE("Setting up test data"),
        ACT("Executing pipeline action"),
        ASSERT("Verifying pipeline outcome"),
        CLEANUP("Cleaning up test data");
        
        private final String description;
        
        TestPhase(String description) {
            this.description = description;
        }
        
        @Override
        public String toString() {
            return description;
        }
    }
    
    @BeforeEach
    protected void setupPipelineTest(TestInfo testInfo) {
        setupTest(testInfo);
        Allure.epic("Pipeline E2E");
        Allure.addAttachment("Pipeline Test ID", testId);
        Allure.addAttachment("Correlation ID", correlationId);
        Allure.addAttachment("Test Type", this.getClass().getSimpleName());
    }
    
    protected void setupTest(TestInfo testInfo) {
        testId = "test-" + RUN_ID + "-" + UUID.randomUUID().toString().substring(0, 8);
        correlationId = "corr-" + testId;
        
        String displayName = testInfo.getDisplayName();
        log.info("Test: {} [testId={}, correlationId={}]", displayName, testId, correlationId);
    }
    
    protected String uniqueHostname() {
        return "host-" + testId;
    }
    
    protected String generateMacAddress() {
        String hex = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        return hex.substring(0, 2) + ":" + hex.substring(2, 4) + ":" + 
               hex.substring(4, 6) + ":" + hex.substring(6, 8) + ":" + 
               hex.substring(8, 10) + ":" + hex.substring(10, 12);
    }
    
    protected void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
    
    @Step("{phase}: {description}")
    protected <T> T executePhase(TestPhase phase, String description, Callable<T> action) {
        log.info("[{}] {}: {}", testId, phase, description);
        try {
            T result = action.call();
            Allure.addAttachment(phase + " Result", String.valueOf(result));
            return result;
        } catch (Exception e) {
            log.error("[{}] {} failed: {}", testId, phase, e.getMessage());
            Allure.addAttachment(phase + " Error", e.getMessage());
            throw new AssertionError(phase + " failed: " + description, e);
        }
    }
    
    @Step("{phase}: {description}")
    protected void executePhase(TestPhase phase, String description, ThrowingRunnable action) {
        executePhase(phase, description, () -> {
            try {
                action.run();
            } catch (Throwable e) {
                throw new RuntimeException(e);
            }
            return null;
        });
    }
    
    @Step("Waiting for: {condition}")
    protected <T> T awaitPipelineCondition(String condition, Duration timeout, Callable<T> probe) {
        log.debug("[{}] Awaiting condition: {} (max {}s)", testId, condition, timeout.getSeconds());
        
        return Awaitility.await()
            .atMost(timeout)
            .pollInterval(Duration.ofSeconds(2))
            .pollDelay(Duration.ofSeconds(1))
            .alias(condition)
            .ignoreExceptions()
            .until(probe, result -> result != null);
    }
    
    @Step("Verifying: {condition}")
    protected void awaitPipelineBooleanCondition(String condition, Duration timeout, Callable<Boolean> probe) {
        awaitPipelineCondition(condition, timeout, () -> {
            Boolean result = probe.call();
            return result != null && result ? true : null;
        });
    }
    
    protected <T> T assertImmediate(String description, Callable<T> action) {
        return executePhase(TestPhase.ASSERT, description + " (immediate)", action);
    }
    
    protected <T> T assertEventual(String description, Duration timeout, Callable<T> condition) {
        return executePhase(TestPhase.ASSERT, description + " (eventual)", 
            () -> awaitPipelineCondition(description, timeout, condition));
    }
    
    protected void logPipelineMetrics(String operation, long startTime) {
        long duration = System.currentTimeMillis() - startTime;
        log.info("[{}] Pipeline operation '{}' completed in {}ms", testId, operation, duration);
        Allure.addAttachment("Pipeline Latency", duration + "ms");
        
        if (duration > PIPELINE_TIMEOUT.toMillis()) {
            log.warn("[{}] Pipeline operation '{}' exceeded timeout: {}ms", testId, operation, duration);
        }
    }
}