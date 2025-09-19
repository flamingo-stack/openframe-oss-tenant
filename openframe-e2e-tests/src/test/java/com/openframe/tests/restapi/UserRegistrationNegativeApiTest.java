package com.openframe.tests.restapi;

import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
@DisplayName("User Registration Negative API Tests")
public class UserRegistrationNegativeApiTest extends ApiBaseTest {

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid passwords")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidPasswords")
    void shouldFailRegistrationWithInvalidPasswords(String password) {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setPassword(password);
        
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(errorResponse.getMessage()).contains("password");
        
        log.info("Password validation working correctly for: '{}'", password);
    }
    
    @ParameterizedTest
    @DisplayName("Should fail registration with invalid emails")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidEmails")
    void shouldFailRegistrationWithInvalidEmails(String email) {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setEmail(email);
        
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        
        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(errorResponse.getMessage()).contains("email");
        
        log.info("Email validation working correctly for: '{}'", email);
    }

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid first names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidFirstNames")
    void shouldFailRegistrationWithInvalidFirstNames(String firstName) {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setFirstName(firstName);
        
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        
        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(errorResponse.getMessage()).contains("firstName");
        
        log.info("FirstName validation working correctly for: '{}'", firstName);
    }
    
    @ParameterizedTest
    @DisplayName("Should fail registration with invalid last names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidLastNames")
    void shouldFailRegistrationWithInvalidLastNames(String lastName) {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setLastName(lastName);
        
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        
        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(errorResponse.getMessage()).contains("lastName");
        
        log.info("✅ LastName validation working correctly for: '{}'", lastName);
    }
    
    @ParameterizedTest
    @DisplayName("Should fail registration with invalid tenant names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidTenantNames")
    void shouldFailRegistrationWithInvalidTenantNames(String tenantName) {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setTenantName(tenantName);
        
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        
        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
        
        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        
        // Flexible assertion for error codes
        assertThat(errorResponse.getCode())
            .withFailMessage("Expected validation error code but got: %s", errorResponse.getCode())
            .isIn("VALIDATION_ERROR", "BAD_REQUEST");
            
        // Flexible assertion for error messages  
        assertThat(errorResponse.getMessage().toLowerCase())
            .withFailMessage("Expected tenant/organization validation message but got: %s", errorResponse.getMessage())
            .containsAnyOf("tenant", "organization", "invalid");
            
        log.info("✅ TenantName validation working correctly for: '{}' [code: {}, message: {}]", 
                 tenantName, errorResponse.getCode(), errorResponse.getMessage());
    }
}
