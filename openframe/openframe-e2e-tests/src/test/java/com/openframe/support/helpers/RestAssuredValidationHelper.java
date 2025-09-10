package com.openframe.support.helpers;

import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;

import static org.hamcrest.Matchers.*;

/**
 * Helper class for REST Assured validation pipeline
 * Provides readable and maintainable validation methods
 */
@Slf4j
public class RestAssuredValidationHelper {
    
    private RestAssuredValidationHelper() {
    }
    
    /**
     * Validate successful response (200 OK)
     */
    public static void validateSuccess(Response response) {
        response.then()
                .statusCode(200)
                .contentType("application/json");
    }
    
    /**
     * Validate error response (400 Bad Request)
     */
    public static void validateBadRequest(Response response) {
        response.then()
                .statusCode(400)
                .contentType("application/json");
    }
    
    /**
     * Validate tenant discover response for non-existing organization
     */
    public static void validateTenantDiscoverNonExisting(Response response, String email) {
        response.then()
                .statusCode(200)
                .body("email", equalTo(email))
                .body("has_existing_accounts", equalTo(false))
                .body("tenant_id", nullValue())
                .body("auth_providers", nullValue());
    }
    
    /**
     * Validate tenant discover response for existing organization
     */
    public static void validateTenantDiscoverExisting(Response response, String email, String tenantId) {
        response.then()
                .statusCode(200)
                .body("email", equalTo(email))
                .body("has_existing_accounts", equalTo(true))
                .body("tenant_id", equalTo(tenantId))
                .body("auth_providers", notNullValue());
    }
    
    /**
     * Validate registration response
     */
    public static void validateRegistrationSuccess(Response response, String tenantName, String tenantDomain) {
        response.then()
                .statusCode(200)
                .body("name", equalTo(tenantName))
                .body("domain", equalTo(tenantDomain))
                .body("status", equalTo("ACTIVE"))
                .body("plan", equalTo("FREE"))
                .body("active", equalTo(true))
                .body("id", notNullValue())
                .body("ownerId", notNullValue());
    }
    
    /**
     * Validate registration error response
     */
    public static void validateRegistrationError(Response response, String expectedCode, String expectedMessage) {
        response.then()
                .statusCode(400)
                .body("code", equalTo(expectedCode))
                .body("message", containsString(expectedMessage));
    }
    
    /**
     * Validate device query response
     */
    public static void validateDeviceQuery(Response response, String machineId) {
        response.then()
                .statusCode(200)
                .body("data.device.machineId", equalTo(machineId))
                .body("data.device.hostname", notNullValue())
                .body("data.device.status", notNullValue());
    }
    
    /**
     * Validate logs query response
     */
    public static void validateLogsQuery(Response response) {
        response.then()
                .statusCode(200)
                .body("data.logs.edges", notNullValue())
                .body("data.logs.pageInfo", notNullValue())
                .body("data.logs.pageInfo.hasNextPage", notNullValue());
    }
    
    /**
     * Validate log filters response
     */
    public static void validateLogFilters(Response response) {
        response.then()
                .statusCode(200)
                .body("data.logFilters.toolTypes", notNullValue())
                .body("data.logFilters.eventTypes", notNullValue())
                .body("data.logFilters.severities", notNullValue());
    }
    
    /**
     * Validate response with custom assertions
     */
    public static void validateCustom(Response response, int expectedStatusCode, String jsonPath, Object expectedValue) {
        response.then()
                .statusCode(expectedStatusCode)
                .body(jsonPath, equalTo(expectedValue));
    }
    
    /**
     * Validate response contains specific text
     */
    public static void validateContainsText(Response response, String expectedText) {
        response.then()
                .body(containsString(expectedText));
    }
    
    /**
     * Validate response header
     */
    public static void validateHeader(Response response, String headerName, String expectedValue) {
        response.then()
                .header(headerName, equalTo(expectedValue));
    }
    
    /**
     * Validate response time is within acceptable range
     */
    public static void validateResponseTime(Response response, long maxTimeMs) {
        response.then()
                .time(lessThan(maxTimeMs));
    }
    
    /**
     * Validate JSON array is not empty
     */
    public static void validateArrayNotEmpty(Response response, String jsonPath) {
        response.then()
                .body(jsonPath, not(empty()));
    }
    
    /**
     * Validate JSON array size
     */
    public static void validateArraySize(Response response, String jsonPath, int expectedSize) {
        response.then()
                .body(jsonPath, hasSize(expectedSize));
    }
    
    /**
     * Validate JSON field exists
     */
    public static void validateFieldExists(Response response, String jsonPath) {
        response.then()
                .body(jsonPath, notNullValue());
    }
    
    /**
     * Validate JSON field is null
     */
    public static void validateFieldIsNull(Response response, String jsonPath) {
        response.then()
                .body(jsonPath, nullValue());
    }
}
