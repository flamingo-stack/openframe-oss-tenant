package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.testData.UserRegistrationDataGenerator;
import com.openframe.data.dto.response.RegistrationResponse;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.data.testData.UserDocument;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.time.Duration;
import java.util.Objects;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
@Tag("smoke")
@Execution(ExecutionMode.SAME_THREAD)
@DisplayName("User Registration API Tests")
public class UserRegistrationApiTest extends ApiBaseTest {

    @Test
    @Order(1)
    @DisplayName("Should successfully register user with valid data")
    void shouldRegisterUserWithValidData() {
        // Prepare test environment
        executePhase(TestPhase.ARRANGE, "Clear test data in MongoDB", this::clearDataInMongo);

        // Generate test user data
        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate test user data",
            UserRegistrationDataGenerator::createOrganization);

        // Send registration request
        Response response = executePhase(TestPhase.ACT, "Send registration request", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        // Parse registration response
        RegistrationResponse registrationResponse = executePhase(TestPhase.ACT, "Parse registration response", () ->
            response.as(RegistrationResponse.class));

        // Verify HTTP status code
        executePhase(TestPhase.ASSERT, "Verify HTTP status code", () ->
            assertEquals(HTTP_OK, response.getStatusCode()));

        // Verify registration response data
        executePhase(TestPhase.ASSERT, "Verify registration response data", () ->
            assertSoftly(softAssertions -> {
                softAssertions.assertThat(registrationResponse.getId()).isNotNull();
                softAssertions.assertThat(registrationResponse.getName()).isEqualTo(userData.getTenantName());
                softAssertions.assertThat(registrationResponse.getDomain()).isEqualTo(userData.getTenantDomain());
                softAssertions.assertThat(registrationResponse.getStatus()).isEqualTo("ACTIVE");
                softAssertions.assertThat(registrationResponse.getPlan()).isEqualTo("FREE");
                softAssertions.assertThat(registrationResponse.getActive()).isTrue();
                softAssertions.assertThat(registrationResponse.getOwnerId()).isNotNull();
            }));

        // Wait for user data in MongoDB
        UserDocument userInDb = executePhase(TestPhase.ASSERT, "Wait for user data in MongoDB", () ->
            Awaitility.await()
                .atMost(Duration.ofSeconds(10))
                .pollInterval(Duration.ofMillis(500))
                .until(() -> DBQuery.findUserByEmail(userData.getEmail()), Objects::nonNull));

        // Verify persisted user data in MongoDB
        executePhase(TestPhase.ASSERT, "Verify persisted user data in MongoDB", () ->
            assertSoftly(softAssertions -> {
                softAssertions.assertThat(userInDb.getEmail()).isEqualTo(userData.getEmail());
                softAssertions.assertThat(userInDb.getFirstName()).isEqualTo(userData.getFirstName());
                softAssertions.assertThat(userInDb.getLastName()).isEqualTo(userData.getLastName());
                softAssertions.assertThat(userInDb.getTenantId()).isNotNull();
                softAssertions.assertThat(userInDb.getStatus()).isEqualTo("ACTIVE");
                softAssertions.assertThat(userInDb.getLoginProvider()).isEqualTo("LOCAL");
                softAssertions.assertThat(userInDb.getEmailVerified()).isFalse();
                softAssertions.assertThat(userInDb.getPasswordHash()).isNotNull();
                softAssertions.assertThat(userInDb.getId()).isNotNull().isEqualTo(registrationResponse.getOwnerId());
                softAssertions.assertThat(userInDb.getRoles()).isNotNull().contains("OWNER");
            }));

        log.info("User registration successful for: {} with ID: {}",
                userData.getEmail(), registrationResponse.getId());
    }

    @Test
    @Order(2)
    @DisplayName("Should fail registration when organization registration is closed")
    void shouldFailRegistrationWhenOrganizationRegistrationIsClosed() {
        String existingTenantName = "ExistingOrganization";

        // Generate test user for existing tenant
        UserRegistrationRequest newUser = executePhase(TestPhase.ARRANGE, "Generate user for existing tenant", () ->
            UserRegistrationDataGenerator.forTenant(existingTenantName));

        // Get user counts before registration attempt
        long[] countsBefore = executePhase(TestPhase.ARRANGE, "Get user counts before test", () -> {
            long userCountBefore = DBQuery.getUserCount();
            long tenantUserCountBefore = DBQuery.getUserCountByTenant(existingTenantName);
            log.info("Users before test: total={}, for tenant '{}'={}",
                userCountBefore, existingTenantName, tenantUserCountBefore);
            return new long[]{userCountBefore, tenantUserCountBefore};
        });

        // Attempt registration on existing organization
        executePhase(TestPhase.ACT, "Attempt registration on existing tenant", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, newUser));

        // Verify user counts did not change
        executePhase(TestPhase.ASSERT, "Verify user counts did not change", () -> {
            long userCountAfter = DBQuery.getUserCount();
            long tenantUserCountAfter = DBQuery.getUserCountByTenant(existingTenantName);

            log.info("Users after test: total={}, for tenant '{}'={}",
                userCountAfter, existingTenantName, tenantUserCountAfter);

            Assertions.assertEquals(countsBefore[0], userCountAfter,
                "User count should not change after failed registration");
            Assertions.assertEquals(countsBefore[1], tenantUserCountAfter,
                "Tenant user count should not change after failed registration");
        });

        log.info("Registration correctly failed for existing organization: {}", existingTenantName);
    }

    @Test
    @Order(3)
    @DisplayName("Should fail registration with duplicate email")
    void shouldFailRegistrationWithDuplicateEmail() {
        // Prepare test environment
        executePhase(TestPhase.ARRANGE, "Clear test data in MongoDB", this::clearDataInMongo);

        // Register first user successfully
        UserRegistrationRequest firstUser = executePhase(TestPhase.ARRANGE, "Generate first user data",
            UserRegistrationDataGenerator::createOrganization);

        executePhase(TestPhase.ARRANGE, "Register first user", () -> {
            Response firstResponse = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, firstUser);
            assertEquals(HTTP_OK, firstResponse.getStatusCode());
        });

        // Attempt to register duplicate user
        UserRegistrationRequest duplicateUser = executePhase(TestPhase.ACT, "Generate duplicate user with same email", () -> {
            return UserRegistrationDataGenerator.createOrganization()
                    .toBuilder()
                    .email(firstUser.getEmail())
                    .build();
        });

        Response response = executePhase(TestPhase.ACT, "Attempt registration with duplicate email", () ->
            ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, duplicateUser));

        // Verify registration failed
        executePhase(TestPhase.ASSERT, "Verify registration failed with 400 status", () ->
            assertEquals(HTTP_BAD_REQUEST, response.getStatusCode()));

        executePhase(TestPhase.ASSERT, "Verify error response contains validation error", () -> {
            ErrorResponse errorResponse = response.as(ErrorResponse.class);
            assertThat(errorResponse.getCode()).isIn("VALIDATION_ERROR", "BAD_REQUEST");
            assertThat(errorResponse.getMessage()).isNotNull();
        });

        log.info("Registration correctly failed for duplicate email: {}", firstUser.getEmail());
    }

    private void clearDataInMongo() {
        long userCount = DBQuery.getUserCount();
        long tenantCount = DBQuery.getTenantCount();

        if (userCount > 0 || tenantCount > 0) {
            log.info("Clearing database before registration test - found {} users and {} tenants", userCount, tenantCount);
            DBQuery.clearAllData();
        }
    }
}
