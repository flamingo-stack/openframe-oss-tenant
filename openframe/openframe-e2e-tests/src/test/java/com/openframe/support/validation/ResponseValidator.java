package com.openframe.support.validation;

import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Assertions;

import java.util.List;
import java.util.function.Predicate;

@Slf4j
public class ResponseValidator {
    
    private final Response response;
    private final StringBuilder errorMessages = new StringBuilder();
    
    public ResponseValidator(Response response) {
        this.response = response;
    }
    
    /**
     * Create validator for response
     */
    public static ResponseValidator validate(Response response) {
        return new ResponseValidator(response);
    }
    
    /**
     * Check status code
     */
    public ResponseValidator statusCode(int expectedStatusCode) {
        int actualStatusCode = response.getStatusCode();
        if (actualStatusCode != expectedStatusCode) {
            addError("Expected status code %d but was %d", expectedStatusCode, actualStatusCode);
        }
        return this;
    }
    
    /**
     * Check JSON field value
     */
    public ResponseValidator jsonFieldEquals(String jsonPath, Object expectedValue) {
        Object actualValue = response.jsonPath().get(jsonPath);
        if (!java.util.Objects.equals(expectedValue, actualValue)) {
            addError("Expected JSON field '%s' to be '%s' but was '%s'", 
                    jsonPath, expectedValue, actualValue);
        }
        return this;
    }
    
    /**
     * Check JSON field with custom predicate
     */
    public ResponseValidator jsonFieldMatches(String jsonPath, Predicate<Object> predicate) {
        Object value = response.jsonPath().get(jsonPath);
        if (!predicate.test(value)) {
            addError("JSON field '%s' with value '%s' did not match predicate", jsonPath, value);
        }
        return this;
    }
    
    /**
     * Check response contains text
     */
    public ResponseValidator containsText(String expectedText) {
        String responseBody = response.getBody().asString();
        if (!responseBody.contains(expectedText)) {
            addError("Expected response to contain text '%s' but it didn't", expectedText);
        }
        return this;
    }

    /**
     * Assert all validations passed
     */
    public void assertAll() {
        if (!errorMessages.isEmpty()) {
            String fullErrorMessage = String.format(
                "Response validation failed:\nResponse: %s\n\nErrors:\n%s", 
                getResponseSummary(), 
                errorMessages.toString()
            );
            log.error(fullErrorMessage);
            Assertions.fail(fullErrorMessage);
        }
        log.debug("All response validations passed");
    }

    /**
     * Get response summary for error messages
     */
    private String getResponseSummary() {
        return String.format(
            "Status: %d, Content-Type: %s, Time: %dms, Body: %s",
            response.getStatusCode(),
            response.getContentType(),
            response.getTime(),
            response.getBody().asString().substring(0, Math.min(200, response.getBody().asString().length()))
        );
    }
    
    /**
     * Add error message
     */
    private void addError(String message, Object... args) {
        errorMessages.append("• ").append(String.format(message, args)).append("\n");
    }
}

