package com.openframe.tests.integration;

import com.openframe.support.constants.GraphQLQueries;
import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiHelpers;
import com.openframe.tests.e2e.BasePipelineE2ETest;
import io.qameta.allure.*;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * GraphQL device query integration tests.
 * Tests device registration, GraphQL queries, filters, pagination, and search.
 */
@Slf4j
@Epic("Integration Tests")
@Feature("GraphQL Device Queries")
@Story("Device GraphQL operations and queries")
@DisplayName("GraphQL Device Query Integration Tests")
@TestInstance(TestInstance.Lifecycle.PER_METHOD)
@Execution(ExecutionMode.CONCURRENT)
@Tag("integration")
@Tag("graphql")
@Tag("device")
public class GraphQLDeviceQueryIT extends BasePipelineE2ETest {

    private String machineId;
    private Map<String, Object> deviceData;
    
    @BeforeEach
    protected void setupPipelineTest(TestInfo testInfo) {
        super.setupTest(testInfo);
    }
    
    @AfterEach
    void cleanup() {
        if (machineId != null) {
            executePhase(TestPhase.CLEANUP, "Delete test device", () -> {
                ApiHelpers.deleteDevice(machineId);
                log.info("[{}] Cleaned up device: {}", testId, machineId);
            });
        }
    }
    
    @Test
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verify device registration stores in MongoDB and indexes in Pinot")
    @DisplayName("Device registration stores and indexes correctly")
    void deviceRegistrationStoresAndIndexesCorrectly() {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting device registration test", testId);
        
        try {
            executePhase(TestPhase.ARRANGE, "Prepare device registration data", () -> {
                String hostname = uniqueHostname();
                deviceData = ApiHelpers.createAgentData(hostname);
                Allure.addAttachment("Device Data", deviceData.toString());
            });
            
            machineId = executePhase(TestPhase.ACT, "Register device via API", () -> {
                String managementKey = ApiHelpers.getActiveManagementKey();
                return ApiHelpers.registerAgent(managementKey, deviceData);
            });
            
            assertImmediate("Device stored in MongoDB", () -> {
                Map<String, Object> device = ApiHelpers.queryDevice(machineId);
                
                assertThat(device)
                    .as("Device should be immediately available in MongoDB")
                    .isNotNull()
                    .containsEntry("machineId", machineId)
                    .containsEntry("status", "ACTIVE")
                    .containsKey("hostname");
                
                return device;
            });
            
            assertEventual("Device appears in Pinot filters", EVENTUAL_CONSISTENCY, () -> {
                var response = ApiHelpers.graphqlQuery(GraphQLQueries.DEVICE_FILTERS_QUERY);
                if (response.getStatusCode() != 200) {
                    return null;
                }
                
                Integer count = response.jsonPath().getInt("data.deviceFilters.filteredCount");
                return (count != null && count > 0) ? count : null;
            });
            
            assertImmediate("Device appears in device list", () -> {
                Map<String, Object> devices = ApiHelpers.queryDevices(100, null);
                
                assertThat(devices)
                    .as("Device list query should return data")
                    .isNotNull();
                
                if (devices != null && devices.containsKey("edges")) {
                    List<Map<String, Object>> edges = (List<Map<String, Object>>) devices.get("edges");
                    
                    boolean found = edges != null && edges.stream()
                        .map(e -> (Map<String, Object>) e.get("node"))
                        .anyMatch(n -> machineId.equals(n.get("machineId")));
                    
                    assertThat(found)
                        .as("Device should appear in paginated list")
                        .isTrue();
                    
                    return found;
                }
                
                return false;
            });
            
            logPipelineMetrics("Device Registration", startTime);
            
        } catch (Exception e) {
            log.error("[{}] Device registration test failed: {}", testId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device remains queryable after registration")
    @DisplayName("Device query stability after registration")
    @Tag("stability")
    void deviceQueryStabilityAfterRegistration() {
        long startTime = System.currentTimeMillis();
        
        machineId = executePhase(TestPhase.ARRANGE, "Register device for stability test", () -> {
            String managementKey = ApiHelpers.getActiveManagementKey();
            Map<String, Object> data = ApiHelpers.createAgentData("stability-test-" + testId);
            return ApiHelpers.registerAgent(managementKey, data);
        });
        
        executePhase(TestPhase.ACT, "Verify query stability", () -> {
            log.info("Verifying device remains queryable through different endpoints");
        });
        
        assertImmediate("Device queryable via direct API", () -> {
            Map<String, Object> device = ApiHelpers.queryDevice(machineId);
            assertThat(device)
                .as("Device should remain queryable")
                .isNotNull()
                .containsEntry("machineId", machineId);
            return device;
        });
        
        logPipelineMetrics("Device Query Stability", startTime);
    }
    
    // ==================== GraphQL Query Tests ====================
    
    @Test
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verify devices are queryable through GraphQL from MongoDB")
    @DisplayName("Devices queryable through GraphQL pipeline")
    @Tag("graphql")
    void devicesQueryableThroughPipeline() {
        long startTime = System.currentTimeMillis();
        
        Integer filteredCount = executePhase(TestPhase.ARRANGE, "Query device count", () -> {
            String query = """
                {
                    devices(pagination: { limit: 1 }) {
                        filteredCount
                        pageInfo {
                            hasNextPage
                        }
                    }
                }
                """;
            Response response = ApiHelpers.graphqlQuery(query);
            
            assertThat(response.getStatusCode())
                .as("GraphQL should respond successfully")
                .isEqualTo(200);
            
            return response.jsonPath().get("data.devices.filteredCount");
        });
        
        assertImmediate("Device count available", () -> {
            assertThat(filteredCount)
                .as("Device count should be available")
                .isNotNull()
                .isGreaterThanOrEqualTo(0);
            
            return filteredCount;
        });
        
        List<Map<String, Object>> deviceNodes = executePhase(TestPhase.ACT, "Query recent devices", () -> {
            String query = """
                {
                    devices(pagination: { limit: 10 }) {
                        edges {
                            node {
                                id
                                machineId
                                type
                                status
                                lastSeen
                                osType
                                osVersion
                                hostname
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
                """;
            
            Response response = ApiHelpers.graphqlQuery(query);
            List<Map<String, Object>> edges = response.jsonPath().getList("data.devices.edges");
            
            if (edges != null && !edges.isEmpty()) {
                return edges.stream()
                    .map(e -> (Map<String, Object>) e.get("node"))
                    .toList();
            }
            
            return List.of();
        });
        
        if (!deviceNodes.isEmpty()) {
            Map<String, Object> firstDevice = deviceNodes.get(0);
            
            assertImmediate("Device details retrievable", () -> {
                String detailsQuery = String.format("""
                    {
                        device(id: "%s") {
                            id
                            toolDeviceId
                            toolType
                            status
                            properties
                            metrics {
                                cpuUsage
                                memoryUsage
                                diskUsage
                            }
                            lastActivity {
                                type
                                timestamp
                                description
                            }
                        }
                    }
                    """,
                    firstDevice.get("id")
                );
                
                Response response = ApiHelpers.graphqlQuery(detailsQuery);
                Map<String, Object> details = response.jsonPath().getMap("data.device");
                
                if (details != null) {
                    assertThat(details)
                        .as("Device details should contain id")
                        .containsKey("id");
                    
                    assertThat(details.get("id"))
                        .as("Device ID should match")
                        .isEqualTo(firstDevice.get("id"));
                }
                
                return details;
            });
        } else {
            log.warn("[{}] No devices available in system for testing", testId);
            Allure.addAttachment("Warning", "No devices available - pipeline may be empty");
        }
        
        logPipelineMetrics("Device Query", startTime);
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("GraphQL query validates required fields")
    @DisplayName("GraphQL query validates required fields")
    void graphQLQueryValidatesRequiredFields() {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting GraphQL validation test", testId);
        
        try {
            executePhase(TestPhase.ACT, "Send invalid GraphQL query", () -> {
                String invalidQuery = "{\"query\": \"{ device(invalidField: \\\"test\\\") { machineId } }\"}";
                
                Response response = given()
                    .contentType("application/json")
                    .body(invalidQuery)
                    .when()
                    .post(API_SERVICE_URL + "/graphql")
                    .then()
                    .extract().response();
                
                if (response.getStatusCode() == 200) {
                    assertThat(response.jsonPath().getList("errors"))
                        .as("GraphQL errors")
                        .isNotNull()
                        .isNotEmpty();
                }
                
                log.info("[{}] GraphQL correctly validated schema", testId);
            });
            
            logPipelineMetrics("GraphQL Validation", startTime);
            
        } catch (Exception e) {
            log.error("[{}] GraphQL validation test failed: {}", testId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    // ==================== Filter Tests ====================
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device filters work correctly")
    @DisplayName("Device filters work correctly")
    void deviceFiltersWorkCorrectly() {
        long startTime = System.currentTimeMillis();
        
        List<String> deviceTypes = executePhase(TestPhase.ARRANGE, "Get available device types", () -> {
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.DEVICE_FILTERS_QUERY);
            return response.jsonPath().getList("data.deviceFilters.deviceTypes");
        });
        
        if (deviceTypes != null && !deviceTypes.isEmpty()) {
            String selectedDeviceType = deviceTypes.get(0);
            
            List<Map<String, Object>> filteredDevices = executePhase(TestPhase.ACT, 
                "Query devices filtered by device type: " + selectedDeviceType, () -> {
                
                String query = String.format("""
                    {
                        devices(
                            filter: { deviceTypes: ["%s"] }
                            pagination: { limit: 5 }
                        ) {
                            edges {
                                node {
                                    id
                                    type
                                    hostname
                                }
                            }
                        }
                    }
                    """, selectedDeviceType);
                
                Response response = ApiHelpers.graphqlQuery(query);
                List<Map<String, Object>> edges = response.jsonPath().getList("data.devices.edges");
                
                if (edges != null) {
                    return edges.stream()
                        .map(e -> (Map<String, Object>) e.get("node"))
                        .toList();
                }
                return List.of();
            });
            
            assertImmediate("Filter returns only matching devices", () -> {
                if (!filteredDevices.isEmpty()) {
                    for (Map<String, Object> device : filteredDevices) {
                        assertThat(device.get("type"))
                            .as("Device should match selected device type")
                            .isEqualTo(selectedDeviceType);
                    }
                }
                return true;
            });
        }
        
        logPipelineMetrics("Device Filters", startTime);
    }
    
    // ==================== Pagination Tests ====================
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device pagination works correctly")
    @DisplayName("Device pagination works correctly")
    @Tag("pagination")
    void devicePaginationWorksCorrectly() {
        long startTime = System.currentTimeMillis();
        
        Map<String, Object> firstPage = executePhase(TestPhase.ACT, "Query first page of devices", () -> {
            String query = """
                {
                    devices(pagination: { limit: 2 }) {
                        edges {
                            node {
                                id
                                hostname
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
                """;
            
            Response response = ApiHelpers.graphqlQuery(query);
            return response.jsonPath().getMap("data.devices");
        });
        
        if (firstPage != null) {
            Map<String, Object> pageInfo = (Map<String, Object>) firstPage.get("pageInfo");
            
            if (pageInfo != null && Boolean.TRUE.equals(pageInfo.get("hasNextPage"))) {
                String cursor = (String) pageInfo.get("endCursor");
                
                Map<String, Object> secondPage = executePhase(TestPhase.ACT, "Query next page using cursor", () -> {
                    String query = String.format("""
                        {
                            devices(pagination: { limit: 2, cursor: "%s" }) {
                                edges {
                                    node { id }
                                }
                            }
                        }
                        """, cursor);
                    
                    Response response = ApiHelpers.graphqlQuery(query);
                    return response.jsonPath().getMap("data.devices");
                });
                
                assertImmediate("Pagination returns different results", () -> {
                    List<Map> firstEdges = (List<Map>) firstPage.get("edges");
                    List<Map> secondEdges = (List<Map>) secondPage.get("edges");
                    
                    if (!firstEdges.isEmpty() && !secondEdges.isEmpty()) {
                        String firstId = (String) ((Map) firstEdges.get(0).get("node")).get("id");
                        String secondId = (String) ((Map) secondEdges.get(0).get("node")).get("id");
                        
                        assertThat(firstId)
                            .as("Pages should have different data")
                            .isNotEqualTo(secondId);
                    }
                    
                    return true;
                });
            }
        }
        
        logPipelineMetrics("Device Pagination", startTime);
    }
    
    // ==================== Status Tests ====================
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device status updates are reflected")
    @DisplayName("Device status queries work correctly")
    @Tag("status")
    void deviceStatusQueriesWorkCorrectly() {
        long startTime = System.currentTimeMillis();
        
        List<Map<String, Object>> statusBreakdown = executePhase(TestPhase.ACT, 
            "Query device status breakdown", () -> {
            
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.DEVICE_FILTERS_QUERY);
            return response.jsonPath().getList("data.deviceFilters.statuses");
        });
        
        assertImmediate("Status breakdown is valid", () -> {
            if (statusBreakdown != null && !statusBreakdown.isEmpty()) {
                for (Map<String, Object> status : statusBreakdown) {
                    assertThat(status)
                        .as("Status entry should have required fields")
                        .containsKeys("value", "count");
                    
                    Integer count = (Integer) status.get("count");
                    assertThat(count)
                        .as("Status count should be non-negative")
                        .isGreaterThanOrEqualTo(0);
                }
            }
            return true;
        });
        
        logPipelineMetrics("Device Status", startTime);
    }
    
    // ==================== Search Tests ====================
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify device search functionality works")
    @DisplayName("Device search works correctly")
    @Tag("search")
    void deviceSearchWorksCorrectly() {
        long startTime = System.currentTimeMillis();
        
        String searchTerm = executePhase(TestPhase.ARRANGE, "Determine search term", () -> {
            String query = """
                {
                    devices(pagination: { limit: 1 }) {
                        edges {
                            node {
                                hostname
                            }
                        }
                    }
                }
                """;
            
            Response response = ApiHelpers.graphqlQuery(query);
            List<Map<String, Object>> edges = response.jsonPath().getList("data.devices.edges");
            
            if (edges != null && !edges.isEmpty()) {
                Map<String, Object> node = (Map<String, Object>) edges.get(0).get("node");
                String hostname = (String) node.get("hostname");
                
                if (hostname != null && hostname.length() > 3) {
                    return hostname.substring(0, 3);
                }
            }
            return "test";
        });
        
        List<Map<String, Object>> searchResults = executePhase(TestPhase.ACT, 
            "Search for devices with term: " + searchTerm, () -> {
            
            String query = String.format("""
                {
                    devices(
                        filter: { search: "%s" }
                        pagination: { limit: 10 }
                    ) {
                        edges {
                            node {
                                id
                                hostname
                                toolDeviceId
                            }
                        }
                    }
                }
                """, searchTerm);
            
            Response response = ApiHelpers.graphqlQuery(query);
            List<Map<String, Object>> edges = response.jsonPath().getList("data.devices.edges");
            
            if (edges != null) {
                return edges.stream()
                    .map(e -> (Map<String, Object>) e.get("node"))
                    .toList();
            }
            return List.of();
        });
        
        assertImmediate("Search returns relevant results", () -> {
            log.info("[{}] Search for '{}' returned {} results",
                    testId, searchTerm, searchResults.size());
            
            if (!searchResults.isEmpty()) {
                for (Map<String, Object> result : searchResults) {
                    String hostname = (String) result.get("hostname");
                    String toolDeviceId = (String) result.get("toolDeviceId");
                    
                    boolean matches = (hostname != null && hostname.toLowerCase().contains(searchTerm.toLowerCase())) ||
                                    (toolDeviceId != null && toolDeviceId.toLowerCase().contains(searchTerm.toLowerCase()));
                    
                    assertThat(matches)
                        .as("Search result should contain search term in hostname or toolDeviceId")
                        .isTrue();
                }
            }
            
            return true;
        });
        
        logPipelineMetrics("Device Search", startTime);
    }
}