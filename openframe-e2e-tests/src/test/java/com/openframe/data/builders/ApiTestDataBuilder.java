package com.openframe.data.builders;

import net.datafaker.Faker;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.HashMap;

/**
 * Test data builder for API-related test data
 */
public class ApiTestDataBuilder {
    
    private static final Faker faker = new Faker();

    /**
     * Create API request metadata
     * @param endpoint API endpoint
     * @param data request data
     * @return Map containing API request metadata
     */
    public static Map<String, Object> createApiRequest(String endpoint, Object data) {
        return Map.of(
            "endpoint", endpoint,
            "data", data,
            "timestamp", System.currentTimeMillis(),
            "testId", faker.internet().uuid(),
            "userAgent", "OpenFrame-E2E-Tests/1.0",
            "requestId", faker.internet().uuid()
        );
    }

    /**
     * Create GraphQL query request
     * @param query GraphQL query string
     * @return Map containing GraphQL request
     */
    public static Map<String, Object> createGraphQLRequest(String query) {
        return Map.of(
            "query", query,
            "variables", Map.of(),
            "operationName", null,
            "requestId", faker.internet().uuid()
        );
    }

    /**
     * Create GraphQL query request with variables
     * @param query GraphQL query string
     * @param variables query variables
     * @return Map containing GraphQL request with variables
     */
    public static Map<String, Object> createGraphQLRequest(String query, Map<String, Object> variables) {
        return Map.of(
            "query", query,
            "variables", variables != null ? variables : Map.of(),
            "operationName", null,
            "requestId", faker.internet().uuid()
        );
    }

    /**
     * Create pagination parameters
     * @param limit items per page
     * @param offset items to skip
     * @return Map containing pagination parameters
     */
    public static Map<String, Object> createPaginationParams(int limit, int offset) {
        return Map.of(
            "limit", limit,
            "offset", offset,
            "page", (offset / limit) + 1,
            "pageSize", limit
        );
    }

    /**
     * Create filter parameters for API requests
     * @param filterMap filter criteria
     * @return Map containing filter parameters
     */
    public static Map<String, Object> createFilterParams(Map<String, Object> filterMap) {
        Map<String, Object> params = new HashMap<>(filterMap);
        params.put("filterId", faker.internet().uuid());
        params.put("appliedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return params;
    }

    /**
     * Create authentication headers
     * @param token authentication token
     * @return Map containing auth headers
     */
    public static Map<String, String> createAuthHeaders(String token) {
        return Map.of(
            "Authorization", "Bearer " + token,
            "X-Request-ID", faker.internet().uuid(),
            "Content-Type", "application/json",
            "Accept", "application/json"
        );
    }

    /**
     * Create test metadata for tracking test execution
     * @param testName test name
     * @param testClass test class name
     * @return Map containing test metadata
     */
    public static Map<String, Object> createTestMetadata(String testName, String testClass) {
        return Map.of(
            "testName", testName,
            "testClass", testClass,
            "testId", faker.internet().uuid(),
            "startTime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            "environment", "test",
            "version", "1.0.0"
        );
    }

    /**
     * Edge case builders for API testing
     */
    public static class EdgeCaseBuilder {
        
        /**
         * Create request with very large payload
         * @param endpoint API endpoint
         * @return large API request
         */
        public static Map<String, Object> largePayloadRequest(String endpoint) {
            String largeData = faker.lorem().characters(10000);
            return createApiRequest(endpoint, Map.of("largeField", largeData));
        }
        
        /**
         * Create request with special characters
         * @param endpoint API endpoint
         * @return API request with special characters
         */
        public static Map<String, Object> specialCharactersRequest(String endpoint) {
            return createApiRequest(endpoint, Map.of(
                "specialChars", "!@#$%^&*()_+-={}[]|:;\"'<>,.?/",
                "unicode", "Тест测试テストTest",
                "emoji", "🚀"
            ));
        }
        
        /**
         * Create request with null values
         * @param endpoint API endpoint
         * @return API request with null values
         */
        public static Map<String, Object> nullValuesRequest(String endpoint) {
            Map<String, Object> data = new HashMap<>();
            data.put("nullField", null);
            data.put("emptyString", "");
            data.put("zeroValue", 0);
            return createApiRequest(endpoint, data);
        }
        
        /**
         * Create malformed GraphQL request
         * @return malformed GraphQL request
         */
        public static Map<String, Object> malformedGraphQLRequest() {
            return Map.of(
                "query", "{ invalidQuery { missingBrace }",
                "variables", "not-an-object",
                "operationName", 123
            );
        }
    }

    /**
     * Common API request builders
     */
    public static class CommonRequests {
        
        /**
         * Create health check request
         * @return health check API request
         */
        public static Map<String, Object> healthCheck() {
            return createApiRequest("/actuator/health", Map.of());
        }
        
        /**
         * Create login request
         * @param username username
         * @param password password
         * @return login API request
         */
        public static Map<String, Object> login(String username, String password) {
            return createApiRequest("/oauth/login", Map.of(
                "username", username,
                "password", password,
                "grantType", "password"
            ));
        }
        
        /**
         * Create device list request with pagination
         * @param page page number
         * @param size page size
         * @return device list API request
         */
        public static Map<String, Object> deviceList(int page, int size) {
            return createApiRequest("/api/devices", createPaginationParams(size, page * size));
        }
        
        /**
         * Create device search request
         * @param searchTerm search term
         * @return device search API request
         */
        public static Map<String, Object> deviceSearch(String searchTerm) {
            return createApiRequest("/api/devices/search", Map.of(
                "query", searchTerm,
                "searchFields", new String[]{"hostname", "ipAddress", "operatingSystem"}
            ));
        }
    }
}
