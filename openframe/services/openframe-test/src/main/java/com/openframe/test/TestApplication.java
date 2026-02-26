package com.openframe.test;

import com.openframe.test.runner.TestRunner;
import com.openframe.test.runner.TestRunnerConfig;
import io.qameta.allure.junitplatform.AllureJunitPlatform;
import lombok.extern.slf4j.Slf4j;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;

import static com.openframe.test.SummaryLogger.logSummary;
import static com.openframe.test.SummaryLogger.logTestList;

@Slf4j
public class TestApplication {
    private static final String TEST_PACKAGE = "com.openframe.test.tests";

    public static void main(String[] args) {
//        io.restassured.RestAssured.filters(new AllureRestAssured(), new RequestLoggingFilter());

        AllureJunitPlatform allureListener = new AllureJunitPlatform();
        SummaryGeneratingListener summaryListener = new SummaryGeneratingListener();

        TestRunnerConfig config = TestRunnerConfig.builder()
                .testPackage(TEST_PACKAGE)
                .testListeners(allureListener, summaryListener)
                .build();

        TestRunner testRunner = new TestRunner(config);

        boolean testsPassed = true;

        if (args.length == 0) {
            log.info("Run registration tests");
            TestPlan testPlan = testRunner.discover("registration");
            logTestList(testRunner.list(testPlan));
            testRunner.run(testPlan);
            logSummary(summaryListener.getSummary());
            testsPassed = summaryListener.getSummary().getTestsFailedCount() == 0;
        }
        if (testsPassed) {
            log.info("Run OSS tests");
            TestPlan testPlan = testRunner.discover("oss");
            logTestList(testRunner.list(testPlan));
            testRunner.run(testPlan);
            logSummary(summaryListener.getSummary());
            testsPassed = summaryListener.getSummary().getTestsFailedCount() == 0;
        } else {
            log.error("Registration tests failed - interrupting execution");
        }
        System.exit(testsPassed ? 0 : 1);
    }
}