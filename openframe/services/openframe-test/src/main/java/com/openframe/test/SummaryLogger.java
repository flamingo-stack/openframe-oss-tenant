package com.openframe.test;

import lombok.extern.slf4j.Slf4j;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

@Slf4j
public class SummaryLogger {

    public static void logSummary(TestExecutionSummary summary) {
        log.info("Found: {}", summary.getTestsFoundCount());
        log.info("Succeeded: {}", summary.getTestsSucceededCount());
        log.info("Failed: {}", summary.getTestsFailedCount());
    }
}
