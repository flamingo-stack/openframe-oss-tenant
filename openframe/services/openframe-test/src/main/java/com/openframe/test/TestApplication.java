package com.openframe.test;

import com.openframe.test.listener.SlackClient;
import com.openframe.test.listener.SlackListener;
import com.openframe.test.runner.TestRunner;
import com.openframe.test.runner.TestRunnerConfig;
import io.qameta.allure.junitplatform.AllureJunitPlatform;
import lombok.extern.slf4j.Slf4j;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;

import static com.openframe.test.SummaryLogger.logSummary;
import static com.openframe.test.SummaryLogger.logTestList;
import static org.junit.platform.engine.discovery.DiscoverySelectors.selectPackage;
import static org.junit.platform.launcher.TagFilter.includeTags;

@Slf4j
public class TestApplication {
    private static final String TEST_PACKAGE = "com.openframe.test.tests";

    public static void main(String[] args) {
        AllureJunitPlatform allureListener = new AllureJunitPlatform();
        SummaryGeneratingListener summaryListener = new SummaryGeneratingListener();
        SlackClient slackClient = new SlackClient(System.getenv("SLACK_BOT_TOKEN"), System.getenv("SLACK_CHANNEL_ID"));
        SlackListener slackListener = new SlackListener(slackClient);
        TestRunnerConfig config = TestRunnerConfig.builder()
                .testPackage(TEST_PACKAGE)
                .testListeners(allureListener, summaryListener, slackListener)
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
            LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request()
                    .selectors(selectPackage(config.getTestPackage()))
                    .filters(includeTags("oss"))
                    .build();
            TestPlan testPlan = testRunner.discover(request);
            logTestList(testRunner.list(testPlan));
            testRunner.run(testPlan);
            logSummary(summaryListener.getSummary());
            testsPassed = summaryListener.getSummary().getTestsFailedCount() == 0;

            request = LauncherDiscoveryRequestBuilder.request()
                    .selectors(selectPackage(config.getTestPackage()))
                    .filters(includeTags("reset"))
                    .build();
            testPlan = testRunner.discover(request);
            logTestList(testRunner.list(testPlan));
            testRunner.run(testPlan);
            logSummary(summaryListener.getSummary());
            testsPassed = testsPassed && summaryListener.getSummary().getTestsFailedCount() == 0;
        } else {
            log.error("Registration tests failed - interrupting execution");
        }
        slackListener.sendResults("oss", "localhost", "");
        System.exit(testsPassed ? 0 : 1);
    }
}