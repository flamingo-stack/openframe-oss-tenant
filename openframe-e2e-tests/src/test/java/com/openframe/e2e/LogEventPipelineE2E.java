package com.openframe.e2e;

import com.openframe.support.BasePipelineE2ETest;
import com.openframe.support.helpers.ApiHelpers;
import com.openframe.support.infrastructure.DebeziumMessageFactory;
import com.openframe.support.infrastructure.KafkaTestInfrastructure;
import io.qameta.allure.*;
import io.restassured.response.Response;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Log Event Pipeline End-to-End Tests
 * 
 * Verifies complete log event flow from integrated tools through the pipeline:
 * Tool Database → Debezium CDC → Kafka → Stream Service → Cassandra/Pinot → GraphQL API
 *
 */
@Slf4j
@Epic("Log Event Pipeline")
@Feature("End-to-End Log Processing")
@Tag("log-pipeline")
@DisplayName("Log Event Pipeline E2E")
public class LogEventPipelineE2E extends BasePipelineE2ETest {
    
    private KafkaTestInfrastructure kafka;
    private String testRunId;
    private static final Duration GRAPHQL_TIMEOUT = Duration.ofSeconds(30);
    
    @BeforeEach
    @Override
    protected void setupPipelineTest(TestInfo testInfo) {
        super.setupPipelineTest(testInfo);
        testRunId = "test-" + UUID.randomUUID().toString().substring(0, 8);
        kafka = new KafkaTestInfrastructure(testRunId);
    }
    
    @ParameterizedTest(name = "{0}")
    @MethodSource("toolTestDataProvider")
    @Story("Tool Integration Pipeline")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verify log events flow through the complete pipeline to GraphQL")
    void logEventFlowsThroughPipeline(ToolTestData testData) throws Exception {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting {} log event pipeline test", testRunId, testData.getToolName());
        
        try {
            executePhase(TestPhase.ARRANGE, "Setup Kafka consumers", () -> {
                setupKafkaConsumers(testData.getSourceTopic());
                return null;
            });
            
            String message = executePhase(TestPhase.ACT, "Publish log event", () -> {
                log.info("[{}] Publishing {} log event", testRunId, testData.getToolName());
                return testData.createMessage(testRunId);
            });
            
            CompletableFuture<Boolean> publishResult = kafka.publishMessage(
                testData.getSourceTopic(), 
                testData.getEntityId(testRunId), 
                message
            );
            
            boolean published = publishResult.get(10, TimeUnit.SECONDS);
            assertTrue(published, "Message should be published successfully");
            
            ConsumerRecord<String, String> record = executePhase(
                TestPhase.ASSERT, 
                "Verify message in Pinot topic",
                () -> verifyMessageInPinotTopic(testRunId)
            );
            
            assertThat(record).isNotNull();
            assertThat(record.value()).contains(testRunId);
            
            Map<String, Object> logEntry = executePhase(
                TestPhase.ASSERT,
                "Verify log in GraphQL",
                () -> waitForLogInGraphQL(testData.getToolType(), testRunId, GRAPHQL_TIMEOUT)
            );
            
            assertThat(logEntry)
                .as("Log should be queryable via GraphQL")
                .isNotNull()
                .containsKey("toolEventId")
                .containsKey("toolType")
                .containsKey("timestamp");
            
            assertThat(logEntry.get("toolType"))
                .as("Tool type should match")
                .isEqualTo(testData.getToolType());
            
            log.info("[{}] Successfully verified log in GraphQL: {}", 
                testRunId, logEntry.get("toolEventId"));
            
            logPipelineMetrics(testData.getToolName() + " Pipeline", startTime);
            
        } catch (Exception e) {
            log.error("[{}] {} log event pipeline test failed: {}", 
                testRunId, testData.getToolName(), e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    static Stream<ToolTestData> toolTestDataProvider() {
        return Stream.of(
            new ToolTestData(
                "Tactical RMM",
                "TACTICAL",
                KafkaTestInfrastructure.TOPIC_TACTICAL_RMM_EVENTS,
                testRunId -> "tactical-" + testRunId,
                testRunId -> {
                    String agentId = "tactical-" + testRunId;
                    return DebeziumMessageFactory.createTacticalRmmEvent(
                        agentId, "test-script.ps1", testRunId);
                }
            ),
            new ToolTestData(
                "Fleet MDM",
                "FLEET",
                KafkaTestInfrastructure.TOPIC_FLEET_MDM_EVENTS,
                testRunId -> "fleet-" + testRunId,
                testRunId -> {
                    String hostId = "fleet-" + testRunId;
                    return DebeziumMessageFactory.createFleetMdmEvent(
                        hostId, "POLICY_APPLIED", testRunId);
                }
            ),
            new ToolTestData(
                "MeshCentral",
                "MESHCENTRAL",
                KafkaTestInfrastructure.TOPIC_MESHCENTRAL_EVENTS,
                testRunId -> "mesh-" + testRunId,
                testRunId -> {
                    String machineId = "mesh-" + testRunId;
                    return DebeziumMessageFactory.createMeshCentralEvent(
                        machineId, "DEVICE_CONNECT", testRunId);
                }
            )
        );
    }
    
    @Step("Setup Kafka consumers for {sourceTopic}")
    private void setupKafkaConsumers(String sourceTopic) {
        log.info("[{}] Setting up test consumers", testRunId);
        
        CountDownLatch consumersReady = new CountDownLatch(2);
        
        CompletableFuture.runAsync(() -> {
            kafka.startConsuming(sourceTopic);
            consumersReady.countDown();
        });
        
        CompletableFuture.runAsync(() -> {
            kafka.startConsuming(KafkaTestInfrastructure.TOPIC_PINOT_EVENTS);
            consumersReady.countDown();
        });
        
        try {
            boolean ready = consumersReady.await(2, TimeUnit.SECONDS);
            if (!ready) {
                log.warn("[{}] Consumers may not be fully initialized", testRunId);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while waiting for consumers", e);
        }
        
        Allure.addAttachment("Consumer Topics", 
            String.format("Source: %s\nTarget: %s", sourceTopic, KafkaTestInfrastructure.TOPIC_PINOT_EVENTS));
    }
    
    @Step("Verify message appears in Pinot topic")
    private ConsumerRecord<String, String> verifyMessageInPinotTopic(String testRunId) throws Exception {
        log.info("[{}] Verifying message in Pinot topic", testRunId);
        
        ConsumerRecord<String, String> record = kafka.waitForMessage(
            KafkaTestInfrastructure.TOPIC_PINOT_EVENTS,
            record1 -> record1.value() != null && record1.value().contains(testRunId),
            PIPELINE_TIMEOUT
        );
        
        if (record != null && record.value() != null) {
            Allure.addAttachment("Pinot Message", record.value());
        }
        return record;
    }
    
    @Step("Verify log event is queryable via GraphQL API for {toolType}")
    private Map<String, Object> waitForLogInGraphQL(String toolType, String searchTerm, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        Duration retryInterval = Duration.ofMillis(500);
        int attempts = 0;
        
        while (Instant.now().isBefore(deadline)) {
            attempts++;
            Optional<Map<String, Object>> result = tryGetLogFromGraphQL(toolType, searchTerm);
            if (result.isPresent()) {
                log.info("[{}] Found log in GraphQL after {} attempts", testRunId, attempts);
                Allure.addAttachment("GraphQL Attempts", String.valueOf(attempts));
                return result.get();
            }
            
            try {
                Thread.sleep(retryInterval.toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError(String.format(
                    "[%s] Interrupted while waiting for log in GraphQL (toolType: %s, searchTerm: %s)",
                    testRunId, toolType, searchTerm), e);
            }
        }
        
        throw new AssertionError(String.format(
            "[%s] Log not found in GraphQL after %d ms (toolType: %s, searchTerm: %s, attempts: %d)",
            testRunId, timeout.toMillis(), toolType, searchTerm, attempts));
    }
    
    private Optional<Map<String, Object>> tryGetLogFromGraphQL(String toolType, String searchTerm) {
        try {
            String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
            String query = String.format("""
                {
                    logs(
                        filter: {
                            toolTypes: ["%s"],
                            startDate: "%s",
                            endDate: "%s"
                        },
                        search: "%s",
                        pagination: { limit: 100 }
                    ) {
                        edges {
                            node {
                                toolEventId
                                eventType
                                ingestDay
                                toolType
                                severity
                                userId
                                deviceId
                                summary
                                timestamp
                            }
                        }
                    }
                }
                """, toolType, today, today, searchTerm);
            
            Response response = ApiHelpers.graphqlQuery(query);
            
            if (response.getStatusCode() != 200) {
                log.debug("[{}] GraphQL query returned status: {}", testRunId, response.getStatusCode());
                return Optional.empty();
            }
            
            List<Map<String, Object>> edges = response.jsonPath().getList("data.logs.edges");
            if (edges != null && !edges.isEmpty()) {
                for (Map<String, Object> edge : edges) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> node = (Map<String, Object>) edge.get("node");
                    String summary = (String) node.get("summary");
                    
                    if (summary != null && summary.contains(searchTerm)) {
                        log.debug("[{}] Found log in GraphQL/Pinot: {}", testRunId, node.get("toolEventId"));
                        verifyLogDetailsInCassandra(node);
                        return Optional.of(node);
                    }
                }
            }
            
            log.debug("[{}] Log not yet available in GraphQL for toolType: {} and searchTerm: {}", 
                     testRunId, toolType, searchTerm);
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("[{}] Error querying GraphQL: {}", testRunId, e.getMessage());
            return Optional.empty();
        }
    }
    
    @Step("Verify log details in Cassandra")
    private void verifyLogDetailsInCassandra(Map<String, Object> logEntry) {
        try {
            String query = String.format("""
                {
                    logDetails(
                        ingestDay: "%s",
                        toolType: "%s",
                        eventType: "%s",
                        timestamp: "%s",
                        toolEventId: "%s"
                    ) {
                        toolEventId
                        message
                        details
                    }
                }
                """, 
                logEntry.get("ingestDay"),
                logEntry.get("toolType"),
                logEntry.get("eventType"),
                logEntry.get("timestamp"),
                logEntry.get("toolEventId"));
            
            Response response = ApiHelpers.graphqlQuery(query);
            
            if (response.getStatusCode() == 200) {
                Map<String, Object> details = response.jsonPath().getMap("data.logDetails");
                if (details != null) {
                    log.info("[{}] Successfully verified log details in Cassandra for: {}", 
                             testRunId, logEntry.get("toolEventId"));
                    Allure.addAttachment("Cassandra Details", details.toString());
                }
            }
        } catch (Exception e) {
            log.debug("[{}] Could not verify Cassandra details: {}", testRunId, e.getMessage());
        }
    }
    
    protected String getTestPrefix() {
        return "log";
    }
    
    @Getter
    @AllArgsConstructor
    private static class ToolTestData {
        private final String toolName;
        private final String toolType;
        private final String sourceTopic;
        private final java.util.function.Function<String, String> entityIdGenerator;
        private final java.util.function.Function<String, String> messageGenerator;
        
        public String getEntityId(String testRunId) {
            return entityIdGenerator.apply(testRunId);
        }
        
        public String createMessage(String testRunId) {
            return messageGenerator.apply(testRunId);
        }
        
        @Override
        public String toString() {
            return toolName;
        }
    }
}