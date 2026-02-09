package com.openframe.test;

import com.openframe.test.runner.TestRunner;
import lombok.extern.slf4j.Slf4j;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

import static com.openframe.test.SummaryLogger.logSummary;

@Slf4j
public class TestApplication {
    private static final String TEST_PACKAGE = "com.openframe.test.tests";

    public static void main(String[] args) {
        TestRunner testRunner = new TestRunner(TEST_PACKAGE);
        boolean allTestsPassed = true;

        if (args.length == 0) {
            log.info("Run registration tests");
            TestExecutionSummary registrationSummary = testRunner.runTests("registration");
            logSummary(registrationSummary);
            allTestsPassed = registrationSummary.getTestsFailedCount() == 0;
            if (allTestsPassed) {
                log.info("Run OSS tests");
                TestExecutionSummary ossSummary = testRunner.runTests("oss");
                logSummary(ossSummary);
                allTestsPassed = ossSummary.getTestsFailedCount() == 0;

                log.info("Run Password Reset tests");
                TestExecutionSummary resetSummary = testRunner.runTests("reset");
                logSummary(resetSummary);
                allTestsPassed = allTestsPassed && resetSummary.getTestsFailedCount() == 0;
            } else {
                log.error("Owner Registration tests failed - interrupting execution");
            }
        } else if (args[0].equals("skipRegistration")) {
            log.info("Skip registration tests");

            log.info("Run OSS tests");
            TestExecutionSummary ossSummary = testRunner.runTests("oss");
            logSummary(ossSummary);
            allTestsPassed = ossSummary.getTestsFailedCount() == 0;

            log.info("Run Password Reset tests");
            TestExecutionSummary resetSummary = testRunner.runTests("reset");
            logSummary(resetSummary);
            allTestsPassed = allTestsPassed && resetSummary.getTestsFailedCount() == 0;
        }

        System.exit(allTestsPassed ? 0 : 1);
    }
}