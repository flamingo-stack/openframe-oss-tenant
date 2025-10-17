package com.openframe.tests.restapi;

import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.testData.UserRegistrationDataGenerator;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
@Tag("Regression")
@DisplayName("User Registration Negative API Tests")
public class UserRegistrationNegativeApiTest extends ApiBaseTest {

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid passwords")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidPasswords")
    void shouldFailRegistrationWithInvalidPasswords(String password) {
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate user with invalid password",
                () -> UserRegistrationDataGenerator.createOrganization()
                        .toBuilder()
                        .password(password)
                        .build());

        Response response = executePhase(TestPhase.ACT, "Attempt registration with invalid password", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify validation error response", () -> {
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
            ErrorResponse errorResponse = response.as(ErrorResponse.class);
            assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(errorResponse.getMessage()).contains("password");
        });

        log.info("Password validation working correctly for: '{}'", password);
    }

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid emails")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidEmails")
    void shouldFailRegistrationWithInvalidEmails(String email) {
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate user with invalid email",
                () -> UserRegistrationDataGenerator.createOrganization()
                .toBuilder()
                .email(email)
                .build());

        Response response = executePhase(TestPhase.ACT, "Attempt registration with invalid email", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify validation error response", () -> {
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
            ErrorResponse errorResponse = response.as(ErrorResponse.class);
            assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(errorResponse.getMessage()).contains("email");
        });

        log.info("Email validation working correctly for: '{}'", email);
    }

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid first names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidFirstNames")
    void shouldFailRegistrationWithInvalidFirstNames(String firstName) {
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate user with invalid firstName",
                () -> UserRegistrationDataGenerator.createOrganization()
                .toBuilder()
                .firstName(firstName)
                .build());

        Response response = executePhase(TestPhase.ACT, "Attempt registration with invalid firstName", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify validation error response", () -> {
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
            ErrorResponse errorResponse = response.as(ErrorResponse.class);
            assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(errorResponse.getMessage()).contains("firstName");
        });

        log.info("FirstName validation working correctly for: '{}'", firstName);
    }

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid last names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidLastNames")
    void shouldFailRegistrationWithInvalidLastNames(String lastName) {
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate user with invalid lastName", () -> {
            return UserRegistrationDataGenerator.createOrganization()
                    .toBuilder()
                    .lastName(lastName)
                    .build();
        });

        Response response = executePhase(TestPhase.ACT, "Attempt registration with invalid lastName", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify validation error response", () -> {
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
            ErrorResponse errorResponse = response.as(ErrorResponse.class);
            assertThat(errorResponse.getCode()).isEqualTo("VALIDATION_ERROR");
            assertThat(errorResponse.getMessage()).contains("lastName");
        });

        log.info("LastName validation working correctly for: '{}'", lastName);
    }

    @ParameterizedTest
    @DisplayName("Should fail registration with invalid tenant names")
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#invalidTenantNames")
    void shouldFailRegistrationWithInvalidTenantNames(String tenantName) {
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate user with invalid tenantName", () -> {
            return UserRegistrationDataGenerator.createOrganization()
                    .toBuilder()
                    .tenantName(tenantName)
                    .build();
        });

        Response response = executePhase(TestPhase.ACT, "Attempt registration with invalid tenantName", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify validation error response", () -> {
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());
            ErrorResponse errorResponse = response.as(ErrorResponse.class);

            assertThat(errorResponse.getCode())
                .withFailMessage("Expected validation error code but got: %s", errorResponse.getCode())
                .isIn("VALIDATION_ERROR", "BAD_REQUEST");

            assertThat(errorResponse.getMessage().toLowerCase())
                .withFailMessage("Expected tenant/organization validation message but got: %s", errorResponse.getMessage())
                .containsAnyOf("tenant", "organization", "invalid");
        });

        log.info(" TenantName validation working correctly for: '{}' [code: {}, message: {}]",
                 tenantName, response.as(ErrorResponse.class).getCode(), response.as(ErrorResponse.class).getMessage());
    }
}
