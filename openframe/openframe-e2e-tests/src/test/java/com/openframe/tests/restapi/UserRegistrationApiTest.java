package com.openframe.tests.restapi;

import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.DBQuery;
import com.openframe.data.dto.RegistrationResponse;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import com.openframe.support.validation.ResponseValidator;
import com.openframe.config.MongoDBConnection;
import com.openframe.config.ThreadSafeTestContext;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.junit.jupiter.api.*;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * User registration API tests with flexible validation
 */
@Slf4j
public class UserRegistrationApiTest extends ApiBaseTest {

    private static String createdUserId;
    private static String createdTenantId;

    @Test
    @Order(1)
    @DisplayName("Should successfully register user with valid data")
    void shouldRegisterUserWithValidData() {
        long userCount = DBQuery.getUserCount();
        long tenantCount = DBQuery.getTenantCount();
        
        if (userCount > 0 || tenantCount > 0) {
            log.info("Clearing database before registration test - found {} users and {} tenants", userCount, tenantCount);
            DBQuery.clearAllData();
        }

        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);

        log.debug("Response status: {}, body: {}", response.getStatusCode(), response.getBody().asString());

        RegistrationResponse registrationResponse = response.as(RegistrationResponse.class);

        assertEquals(HTTP_OK, response.getStatusCode());

        assertSoftly(softAssertions -> {
            softAssertions.assertThat(registrationResponse.getId())
                    .isNotNull();
            softAssertions.assertThat(registrationResponse.getName())
                    .isEqualTo(userData.getTenantName());
            softAssertions.assertThat(registrationResponse.getDomain())
                    .isEqualTo(userData.getTenantDomain());
            softAssertions.assertThat(registrationResponse.getStatus())
                    .isEqualTo("ACTIVE");
            softAssertions.assertThat(registrationResponse.getPlan())
                    .isEqualTo("FREE");
            softAssertions.assertThat(registrationResponse.getActive())
                    .isTrue();
            softAssertions.assertThat(registrationResponse.getOwnerId())
                    .isNotNull();

            sleep();

            long totalUsers = DBQuery.getUserCount();
            log.info("Total users in database after sleep: {}", totalUsers);

            Document userInDb = DBQuery.findUserByTenantName(userData.getTenantName());
            log.info("User found by tenantName '{}': {}", userData.getTenantName(), userInDb != null ? "YES" : "NO");

            if (userInDb == null) {
                log.warn("User not found in database after 5 seconds. Total users: {}", totalUsers);

                Document userByEmail = DBQuery.findUserByEmail(userData.getEmail());
                log.info("User found by email '{}': {}", userData.getEmail(), userByEmail != null ? "YES" : "NO");
            }

            softAssertions.assertThat(userInDb)
                    .isNotNull();

            softAssertions.assertThat(userInDb.getString("email"))
                    .isEqualTo(userData.getEmail());
            softAssertions.assertThat(userInDb.getString("firstName"))
                    .isEqualTo(userData.getFirstName());
            softAssertions.assertThat(userInDb.getString("lastName"))
                    .isEqualTo(userData.getLastName());
            softAssertions.assertThat(userInDb.getString("tenantId"))
                    .isNotNull();
            softAssertions.assertThat(userInDb.getString("tenantDomain"))
                    .isEqualTo(userData.getTenantDomain());
            softAssertions.assertThat(userInDb.getString("status"))
                    .isEqualTo("ACTIVE");
            softAssertions.assertThat(userInDb.getString("loginProvider"))
                    .isEqualTo("LOCAL");
            softAssertions.assertThat(userInDb.getBoolean("emailVerified"))
                    .isFalse();
            softAssertions.assertThat(userInDb.getString("passwordHash"))
                    .isNotNull();
            softAssertions.assertThat(userInDb.getString("_id"))
                    .isNotNull()
                    .isEqualTo(registrationResponse.getOwnerId());
            softAssertions.assertThat(userInDb.getString("tenantId"))
                    .isNotNull();
            softAssertions.assertThat(userInDb.get("roles"))
                    .isNotNull();
        });

        Document userInDb = DBQuery.findUserByTenantName(userData.getTenantName());
        createdUserId = userInDb.getString("_id");
        createdTenantId = userInDb.getString("tenantId");
        
        // Register created data for automatic cleanup
        registerUserForCleanup(createdUserId);
        registerTenantForCleanup(createdTenantId);

        log.info("User registration successful for: {} with ID: {}",
                userData.getEmail(), registrationResponse.getId());
    }

    @Test
    @Order(2)
    @DisplayName("Should fail registration when organization registration is closed")
    void shouldFailRegistrationWhenOrganizationRegistrationIsClosed() {
        String existingTenantName = "ExistingOrganization";
        UserRegistrationBuilder newUser = UserRegistrationBuilder.forTenant(existingTenantName);

        log.info("Testing registration attempt on existing organization: {}", existingTenantName);

        long userCountBefore = DBQuery.getUserCount();
        long tenantUserCountBefore = DBQuery.getUserCountByTenant(existingTenantName);

        log.info("Users in database before test: total={}, for tenant '{}'={}",
                userCountBefore, existingTenantName, tenantUserCountBefore);

        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, newUser);

        ResponseValidator.validate(response)
                .statusCode(HTTP_BAD_REQUEST)
                .jsonFieldEquals("code", "BAD_REQUEST")
                .containsText("Registration is closed for this organization")
                .assertAll();

        long userCountAfter = DBQuery.getUserCount();
        long tenantUserCountAfter = DBQuery.getUserCountByTenant(existingTenantName);

        log.info("Users in database after test: total={}, for tenant '{}'={}",
                userCountAfter, existingTenantName, tenantUserCountAfter);

        Assertions.assertEquals(userCountBefore, userCountAfter,
                "User count should not change after failed registration");
        Assertions.assertEquals(tenantUserCountBefore, tenantUserCountAfter,
                "Tenant user count should not change after failed registration");

        log.info("Registration correctly failed for existing organization: {}", existingTenantName);
    }

    @Test
    @Order(3)
    @DisplayName("Should fail registration with invalid password")
    void shouldFailRegistrationWithInvalidPassword() {
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userData.setPassword("pass1");

        log.info("Testing registration with invalid password: {}", userData.getPassword());

        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);

        log.debug("Response status: {}, body: {}", response.getStatusCode(), response.getBody().asString());

        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());

        assertSoftly(softAssertions -> {
            softAssertions.assertThat(response.jsonPath().getString("code"))
                    .isEqualTo("VALIDATION_ERROR");
            softAssertions.assertThat(response.jsonPath().getString("message"))
                    .contains("Password must be at least 8 characters")
                    .contains("Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character");
        });

        log.info("Registration correctly failed with invalid password validation");
    }
}
