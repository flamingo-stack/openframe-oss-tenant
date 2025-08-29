package com.openframe.e2e;

import com.openframe.support.BasePipelineE2ETest;
import com.openframe.support.data.TestDataGenerator;
import com.openframe.support.helpers.ApiHelpers;
import com.openframe.support.infrastructure.KafkaTestInfrastructure;
import io.qameta.allure.*;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Device Pipeline End-to-End Tests
 * 
 * Verifies complete device flow from registration through the pipeline:
 * Agent Registration → Kafka (devices-topic) → Pinot → GraphQL API
 * 
 * Tests:
 * - Device registration and Kafka event publishing
 * - Device filters from Pinot (aggregations, counts)
 * - Device data accessibility via GraphQL (single device and list queries)
 */
@Slf4j
@Epic("Device Pipeline")
@Feature("End-to-End Device Processing")
@Tag("device-pipeline")
@DisplayName("Device Pipeline E2E")
public class DevicePipelineE2E extends BasePipelineE2ETest {
    
    private KafkaTestInfrastructure kafka;
    private String testRunId;
    private static final Duration PINOT_INDEXING_TIMEOUT = Duration.ofSeconds(45);
    private static final Duration MONGODB_TIMEOUT = Duration.ofSeconds(10);
    
    @BeforeEach
    @Override
    protected void setupPipelineTest(TestInfo testInfo) {
        super.setupPipelineTest(testInfo);
        testRunId = "test-" + UUID.randomUUID().toString().substring(0, 8);
        kafka = new KafkaTestInfrastructure(testRunId);
    }
    
    @Test
    @Story("Device Registration Pipeline")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verify device registration flows through complete pipeline to MongoDB and Pinot")
    void deviceRegistrationFlowsThroughPipeline() throws Exception {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting device registration pipeline test", testRunId);
        
        try {
            // ARRANGE
            String managementKey = executePhase(TestPhase.ARRANGE, "Get management key", () -> {
                String key = ApiHelpers.getActiveManagementKey();
                log.info("[{}] Retrieved management key", testRunId);
                return key;
            });
            
            Map<String, Object> deviceData = executePhase(TestPhase.ARRANGE, "Prepare device data", () -> {
                String hostname = "test-device-" + testRunId;
                return ApiHelpers.createAgentData(hostname);
            });
            
            CountDownLatch kafkaConsumerReady = executePhase(TestPhase.ARRANGE, "Setup Kafka consumer", () -> {
                CountDownLatch latch = new CountDownLatch(1);
                CompletableFuture.runAsync(() -> {
                    kafka.startConsuming(KafkaTestInfrastructure.TOPIC_DEVICES);
                    latch.countDown();
                });
                return latch;
            });
            
            assertTrue(kafkaConsumerReady.await(2, TimeUnit.SECONDS), "Kafka consumer should be ready");
            
            // ACT - Register device
            String machineId = executePhase(TestPhase.ACT, "Register device", () -> {
                String id = ApiHelpers.registerAgent(managementKey, deviceData);
                log.info("[{}] Device registered with machineId: {}", testRunId, id);
                
                // Add a small delay to ensure Kafka message is published
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                
                return id;
            });
            
            // ASSERT - Verify Kafka message
            ConsumerRecord<String, String> kafkaMessage = executePhase(
                TestPhase.ASSERT,
                "Verify message in devices-topic", 
                () -> kafka.waitForMessage(
                    KafkaTestInfrastructure.TOPIC_DEVICES,
                    record -> record.key() != null && record.key().equals(machineId),
                    Duration.ofSeconds(30)
                )
            );
            
            assertThat(kafkaMessage)
                .as("Device message should be published to Kafka")
                .isNotNull();
            
            assertThat(kafkaMessage.value())
                .as("Message should contain device data")
                .contains(machineId)
                .contains("\"status\":\"ACTIVE\"");
            
            Allure.addAttachment("Kafka Device Message", kafkaMessage.value());
            
            // ASSERT - Verify Pinot filters (eventual consistency)
            Map<String, Object> deviceFilters = executePhase(
                TestPhase.ASSERT,
                "Verify device appears in Pinot filters",
                () -> waitForDeviceInPinotFilters(PINOT_INDEXING_TIMEOUT)
            );
            
            assertThat(deviceFilters)
                .as("Device filters should be available from Pinot")
                .isNotNull()
                .containsKey("filteredCount")
                .containsKey("statuses");
            
            Integer filteredCount = (Integer) deviceFilters.get("filteredCount");
            assertThat(filteredCount)
                .as("At least one device should be indexed in Pinot")
                .isGreaterThan(0);
            
            // ASSERT - Verify device via GraphQL (complete verification)
            Map<String, Object> device = executePhase(
                TestPhase.ASSERT,
                "Verify device is fully accessible via GraphQL",
                () -> waitForDeviceInGraphQL(machineId, PINOT_INDEXING_TIMEOUT)
            );
            
            assertThat(device)
                .as("Device should be fully accessible via GraphQL")
                .isNotNull()
                .containsEntry("machineId", machineId)
                .containsEntry("hostname", deviceData.get("hostname"))
                .containsKey("status");
            
            // ASSERT - Verify device also appears in list query
            Map<String, Object> deviceInList = executePhase(
                TestPhase.ASSERT,
                "Verify device appears in device list",
                () -> waitForDeviceInGraphQLList(machineId, Duration.ofSeconds(5))
            );
            
            assertThat(deviceInList)
                .as("Device should appear in GraphQL device list")
                .isNotNull()
                .containsEntry("machineId", machineId);
            
            log.info("[{}] Successfully verified device pipeline flow", testRunId);
            logPipelineMetrics("Device Registration Pipeline", startTime);
            
        } catch (Exception e) {
            log.error("[{}] Device pipeline test failed: {}", testRunId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        } finally {
            // CLEANUP
            executePhase(TestPhase.CLEANUP, "Close Kafka infrastructure", () -> {
                kafka.close();
                return null;
            });
        }
    }
    
    @Test
    @Story("Device Filter Aggregation")
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device filters aggregate correctly in Pinot")
    void deviceFiltersAggregateCorrectly() throws Exception {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting device filter aggregation test", testRunId);
        
        try {
            // ARRANGE - Register multiple devices with different statuses
            String managementKey = executePhase(TestPhase.ARRANGE, "Get management key", 
                ApiHelpers::getActiveManagementKey);
            
            List<String> machineIds = executePhase(TestPhase.ARRANGE, "Register multiple devices", () -> {
                List<String> ids = new java.util.ArrayList<>();
                
                // Register 3 devices with different characteristics
                for (int i = 0; i < 3; i++) {
                    Map<String, Object> deviceData = ApiHelpers.createAgentData("filter-test-" + testRunId + "-" + i);
                    String machineId = ApiHelpers.registerAgent(managementKey, deviceData);
                    ids.add(machineId);
                    log.info("[{}] Registered device {} for filter test", testRunId, machineId);
                }
                
                return ids;
            });
            
            // ACT - Query filters
            Map<String, Object> filters = executePhase(TestPhase.ACT, "Query device filters", () -> {
                // Wait a bit for Pinot indexing
                Thread.sleep(5000);
                
                String query = """
                    {
                        deviceFilters {
                            filteredCount
                            statuses {
                                value
                                count
                            }
                            deviceTypes {
                                value
                                count
                            }
                            osTypes {
                                value
                                count
                            }
                        }
                    }
                    """;
                
                Response response = ApiHelpers.graphqlQuery(query);
                response.then().statusCode(200);
                return response.jsonPath().getMap("data.deviceFilters");
            });
            
            // ASSERT
            assertThat(filters)
                .as("Filters should be returned")
                .isNotNull()
                .containsKey("filteredCount")
                .containsKey("statuses");
            
            Integer totalCount = (Integer) filters.get("filteredCount");
            assertThat(totalCount)
                .as("Should have devices counted")
                .isGreaterThanOrEqualTo(machineIds.size());
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> statuses = (List<Map<String, Object>>) filters.get("statuses");
            assertThat(statuses)
                .as("Should have status aggregations")
                .isNotEmpty();
            
            log.info("[{}] Device filters aggregated correctly with {} total devices", testRunId, totalCount);
            logPipelineMetrics("Device Filter Aggregation", startTime);
            
        } catch (Exception e) {
            log.error("[{}] Device filter test failed: {}", testRunId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    @Step("Wait for device to be accessible via GraphQL")
    private Map<String, Object> waitForDeviceInGraphQL(String machineId, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        int attempts = 0;
        
        while (Instant.now().isBefore(deadline)) {
            attempts++;
            Optional<Map<String, Object>> result = tryGetDeviceFromGraphQL(machineId);
            if (result.isPresent()) {
                log.info("[{}] Found device via GraphQL after {} attempts", testRunId, attempts);
                Allure.addAttachment("GraphQL Query Attempts", String.valueOf(attempts));
                return result.get();
            }
            
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for device in GraphQL", e);
            }
        }
        
        throw new AssertionError(String.format(
            "[%s] Device not found via GraphQL after %d ms (machineId: %s, attempts: %d)",
            testRunId, timeout.toMillis(), machineId, attempts));
    }
    
    @Step("Wait for device to appear in Pinot filters")
    private Map<String, Object> waitForDeviceInPinotFilters(Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        int attempts = 0;
        
        while (Instant.now().isBefore(deadline)) {
            attempts++;
            Optional<Map<String, Object>> result = tryGetDeviceFilters();
            if (result.isPresent()) {
                Map<String, Object> filters = result.get();
                Integer count = (Integer) filters.get("filteredCount");
                if (count != null && count > 0) {
                    log.info("[{}] Device indexed in Pinot after {} attempts", testRunId, attempts);
                    Allure.addAttachment("Pinot Query Attempts", String.valueOf(attempts));
                    return filters;
                }
            }
            
            try {
                Thread.sleep(2000); // Pinot indexing can take longer
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for Pinot indexing", e);
            }
        }
        
        throw new AssertionError(String.format(
            "[%s] Device not indexed in Pinot after %d ms (attempts: %d)",
            testRunId, timeout.toMillis(), attempts));
    }
    
    @Step("Wait for device in GraphQL device list")
    private Map<String, Object> waitForDeviceInGraphQLList(String machineId, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        int attempts = 0;
        
        while (Instant.now().isBefore(deadline)) {
            attempts++;
            Optional<Map<String, Object>> result = tryFindDeviceInList(machineId);
            if (result.isPresent()) {
                log.info("[{}] Found device in list after {} attempts", testRunId, attempts);
                return result.get();
            }
            
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for device in list", e);
            }
        }
        
        throw new AssertionError(String.format(
            "[%s] Device not found in list after %d ms (machineId: %s, attempts: %d)",
            testRunId, timeout.toMillis(), machineId, attempts));
    }
    
    private Optional<Map<String, Object>> tryGetDeviceFromGraphQL(String machineId) {
        try {
            String query = String.format("""
                {
                    device(machineId: "%s") {
                        machineId
                        hostname
                        status
                        agentVersion
                        lastSeen
                    }
                }
                """, machineId);
            
            Response response = ApiHelpers.graphqlQuery(query);
            
            if (response.getStatusCode() != 200) {
                log.debug("[{}] GraphQL query returned status: {}", testRunId, response.getStatusCode());
                return Optional.empty();
            }
            
            Map<String, Object> device = response.jsonPath().getMap("data.device");
            if (device != null) {
                log.debug("[{}] Found device via GraphQL: {}", testRunId, device.get("machineId"));
                return Optional.of(device);
            }
            
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("[{}] Error querying device from GraphQL: {}", testRunId, e.getMessage());
            return Optional.empty();
        }
    }
    
    private Optional<Map<String, Object>> tryGetDeviceFilters() {
        try {
            String query = """
                {
                    deviceFilters {
                        filteredCount
                        statuses {
                            value
                            count
                        }
                        deviceTypes {
                            value
                            count
                        }
                    }
                }
                """;
            
            Response response = ApiHelpers.graphqlQuery(query);
            
            if (response.getStatusCode() != 200) {
                log.debug("[{}] Filter query returned status: {}", testRunId, response.getStatusCode());
                return Optional.empty();
            }
            
            Map<String, Object> filters = response.jsonPath().getMap("data.deviceFilters");
            return Optional.ofNullable(filters);
            
        } catch (Exception e) {
            log.warn("[{}] Error querying device filters: {}", testRunId, e.getMessage());
            return Optional.empty();
        }
    }
    
    private Optional<Map<String, Object>> tryFindDeviceInList(String machineId) {
        try {
            String query = """
                {
                    devices(pagination: { limit: 100 }) {
                        edges {
                            node {
                                machineId
                                hostname
                                status
                            }
                        }
                        filteredCount
                    }
                }
                """;
            
            Response response = ApiHelpers.graphqlQuery(query);
            
            if (response.getStatusCode() != 200) {
                return Optional.empty();
            }
            
            List<Map<String, Object>> edges = response.jsonPath().getList("data.devices.edges");
            if (edges != null) {
                for (Map<String, Object> edge : edges) {
                    Map<String, Object> node = (Map<String, Object>) edge.get("node");
                    if (machineId.equals(node.get("machineId"))) {
                        log.debug("[{}] Found device in list: {}", testRunId, machineId);
                        return Optional.of(node);
                    }
                }
            }
            
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("[{}] Error searching device in list: {}", testRunId, e.getMessage());
            return Optional.empty();
        }
    }
    
    protected String getTestPrefix() {
        return "device";
    }
}