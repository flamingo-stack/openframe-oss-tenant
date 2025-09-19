package com.openframe.tests.integration;

import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiHelpers;
import com.openframe.support.constants.GraphQLQueries;
import com.openframe.tests.e2e.BasePipelineE2ETest;
import io.qameta.allure.*;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Slf4j
@Feature("GraphQL API")

@DisplayName("GraphQL Log Query Integration Test")
@TestInstance(TestInstance.Lifecycle.PER_METHOD)
@Execution(ExecutionMode.CONCURRENT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class GraphQLLogQueryIT extends BasePipelineE2ETest {
    
    @BeforeEach
    void setup(TestInfo testInfo) {
        super.setupTest(testInfo);
    }
    
    @Test
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verify logs are queryable through GraphQL from Cassandra and Pinot")
    @DisplayName("Logs are queryable through pipeline")
    void logsQueryableThroughPipeline() {
        long startTime = System.currentTimeMillis();

        Map<String, Object> filters = executePhase(TestPhase.ARRANGE, "Query available log filters", () -> {
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.LOG_FILTERS_QUERY);
            
            assertThat(response.getStatusCode())
                .as("GraphQL should respond successfully")
                .isEqualTo(200);
            
            return response.jsonPath().getMap("data.logFilters");
        });

        assertImmediate("Log filters available from Pinot", () -> {
            assertThat(filters)
                .as("Filters should be available")
                .isNotNull()
                .containsKeys("toolTypes", "eventTypes", "severities");
            
            List<String> toolTypes = (List<String>) filters.get("toolTypes");
            assertThat(toolTypes)
                .as("Tool types should be available")
                .isNotNull();
            
            return toolTypes;
        });

        List<Map<String, Object>> logNodes = executePhase(TestPhase.ACT, "Query recent logs", () -> {
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.RECENT_LOGS_QUERY);
            List<Map<String, Object>> edges = response.jsonPath().getList("data.logs.edges");
            
            if (edges != null && !edges.isEmpty()) {
                return edges.stream()
                    .map(e -> (Map<String, Object>) e.get("node"))
                    .toList();
            }
            
            return List.of();
        });

        if (!logNodes.isEmpty()) {
            Map<String, Object> firstLog = logNodes.get(0);
            
            assertImmediate("Log details retrievable from Cassandra", () -> {
                String detailsQuery = GraphQLQueries.formatLogDetailsQuery(
                    (String) firstLog.get("ingestDay"),
                    (String) firstLog.get("toolType"),
                    (String) firstLog.get("eventType"),
                    (String) firstLog.get("timestamp"),
                    (String) firstLog.get("toolEventId")
                );
                
                Response response = ApiHelpers.graphqlQuery(detailsQuery);
                Map<String, Object> details = response.jsonPath().getMap("data.logDetails");
                
                if (details != null) {
                    assertThat(details)
                        .as("Log details should contain message")
                        .containsKey("message");
                }
                
                return details;
            });
        } else {
            log.warn("[{}] No logs available in system for testing", testId);
            Allure.addAttachment("Warning", "No logs available - pipeline may be empty");
        }
        
        logPipelineMetrics("Log Query", startTime);
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify log filters aggregate correctly from Pinot")
    @DisplayName("Log filters aggregate correctly")
    void logFiltersAggregateCorrectly() {
        long startTime = System.currentTimeMillis();

        List<String> toolTypes = executePhase(TestPhase.ARRANGE, "Get available tool types", () -> {
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.LOG_FILTERS_QUERY);
            return response.jsonPath().getList("data.logFilters.toolTypes");
        });
        
        if (toolTypes != null && !toolTypes.isEmpty()) {
            String selectedTool = toolTypes.get(0);

            List<Map<String, Object>> filteredLogs = executePhase(TestPhase.ACT, 
                "Query logs filtered by tool type: " + selectedTool, () -> {
                
                String query = GraphQLQueries.formatFilteredLogsQuery(selectedTool);
                Response response = ApiHelpers.graphqlQuery(query);
                List<Map<String, Object>> edges = response.jsonPath().getList("data.logs.edges");
                
                if (edges != null) {
                    return edges.stream()
                        .map(e -> (Map<String, Object>) e.get("node"))
                        .toList();
                }
                return List.of();
            });

            assertImmediate("Filtered logs match criteria", () -> {
                for (Map<String, Object> log : filteredLogs) {
                    assertThat(log.get("toolType"))
                        .as("Log should match filter")
                        .isEqualTo(selectedTool);
                }
                return filteredLogs.size();
            });
        }
        
        logPipelineMetrics("Log Filter", startTime);
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Verify log pagination works correctly")
    @DisplayName("Log pagination works correctly")
    @Tag("pagination")
    void logPaginationWorksCorrectly() {
        long startTime = System.currentTimeMillis();

        Map<String, Object> firstPage = executePhase(TestPhase.ACT, "Query first page of logs", () -> {
            Response response = ApiHelpers.graphqlQuery(GraphQLQueries.PAGINATION_FIRST_PAGE_QUERY);
            return response.jsonPath().getMap("data.logs");
        });
        
        if (firstPage != null) {
            Map<String, Object> pageInfo = (Map<String, Object>) firstPage.get("pageInfo");
            
            if (pageInfo != null && Boolean.TRUE.equals(pageInfo.get("hasNextPage"))) {
                String cursor = (String) pageInfo.get("endCursor");

                Map<String, Object> secondPage = executePhase(TestPhase.ACT, "Query next page using cursor", () -> {
                    String query = GraphQLQueries.formatPaginationNextPageQuery(cursor);
                    Response response = ApiHelpers.graphqlQuery(query);
                    return response.jsonPath().getMap("data.logs");
                });

                assertImmediate("Pagination returns different results", () -> {
                    List<Map> firstEdges = (List<Map>) firstPage.get("edges");
                    List<Map> secondEdges = (List<Map>) secondPage.get("edges");
                    
                    if (!firstEdges.isEmpty() && !secondEdges.isEmpty()) {
                        String firstId = (String) ((Map) firstEdges.get(0).get("node")).get("toolEventId");
                        String secondId = (String) ((Map) secondEdges.get(0).get("node")).get("toolEventId");
                        
                        assertThat(firstId)
                            .as("Pages should have different data")
                            .isNotEqualTo(secondId);
                    }
                    
                    return true;
                });
            }
        }
        
        logPipelineMetrics("Log Pagination", startTime);
    }
    
    @Test
    @Severity(SeverityLevel.MINOR)
    @Description("Verify log search functionality works")
    @DisplayName("Log search works correctly")
    @Tag("search")
    void logSearchWorksCorrectly() {
        long startTime = System.currentTimeMillis();

        executePhase(TestPhase.ACT, "Search logs with keyword", () -> {
            String searchTerm = "error"; // Common term likely to exist
            String query = GraphQLQueries.formatLogSearchQuery(searchTerm);
            Response response = ApiHelpers.graphqlQuery(query);

            assertThat(response.getStatusCode())
                .as("Search should respond successfully")
                .isEqualTo(200);

            List<Map> edges = response.jsonPath().getList("data.logs.edges");
            if (edges != null && !edges.isEmpty()) {
                log.info("[{}] Search returned {} results", testId, edges.size());
            } else {
                log.info("[{}] No results for search term: {}", testId, searchTerm);
            }
        });
        
        logPipelineMetrics("Log Search", startTime);
    }
}