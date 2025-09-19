package com.openframe.tests.e2e;

import com.openframe.support.enums.TestPhase;
import com.openframe.tests.BaseTest;
import io.qameta.allure.Allure;
import io.qameta.allure.Step;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Callable;

import org.awaitility.Awaitility;

@Slf4j
public abstract class BasePipelineE2ETest extends BaseTest {

    protected static final Duration EVENTUAL_CONSISTENCY = Duration.ofSeconds(30);
    protected static final Duration PIPELINE_TIMEOUT = Duration.ofSeconds(60);
    
    protected static final String API_SERVICE_URL = "http://openframe-api.microservices.svc.cluster.local:8090";
    protected static final String CLIENT_SERVICE_URL = "http://openframe-client.microservices.svc.cluster.local:8097";
    protected static final String GATEWAY_URL = "http://openframe-gateway.microservices.svc.cluster.local:8080";

    protected <T> void assertImmediate(String description, Callable<T> action) {
        executePhase(TestPhase.ASSERT, description + " (immediate)", action);
    }

    protected <T> void assertEventual(String description, Duration timeout, Callable<T> condition) {
        executePhase(TestPhase.ASSERT, description + " (eventual)",
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

    protected String uniqueHostname() {
        return "host-" + testId;
    }
    
    protected String generateMacAddress() {
        String hex = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        return hex.substring(0, 2) + ":" + hex.substring(2, 4) + ":" + 
               hex.substring(4, 6) + ":" + hex.substring(6, 8) + ":" + 
               hex.substring(8, 10) + ":" + hex.substring(10, 12);
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
}