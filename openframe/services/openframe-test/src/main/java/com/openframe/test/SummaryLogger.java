package com.openframe.test;

import com.openframe.test.runner.Test;
import lombok.extern.slf4j.Slf4j;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

import java.util.List;

@Slf4j
public class SummaryLogger {

    public static void logSummary(TestExecutionSummary summary) {
        log.info("Found: {}", summary.getTestsFoundCount());
        log.info("Succeeded: {}", summary.getTestsSucceededCount());
        log.info("Failed: {}", summary.getTestsFailedCount());
    }

    public static void logTestList(List<Test> tests) {
        log.info("Test Plan:");
        tests.forEach(test -> log.info(test.getDisplayName()));
    }
}
