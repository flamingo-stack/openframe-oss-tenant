package com.openframe.tests.restapi;

import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.DBQuery;
import com.openframe.data.dto.response.RegistrationResponse;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.data.dto.UserDocument;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.junitpioneer.jupiter.RetryingTest;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
public class UserRegistrationApiTest extends ApiBaseTest {

    @Test
    @Order(1)
    @RetryingTest(2)
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

        RegistrationResponse registrationResponse = response.as(RegistrationResponse.class);

        assertEquals(HTTP_OK, response.getStatusCode());

        assertSoftly(softAssertions -> {
            softAssertions.assertThat(registrationResponse.getId()).isNotNull();
            softAssertions.assertThat(registrationResponse.getName()).isEqualTo(userData.getTenantName());
            softAssertions.assertThat(registrationResponse.getDomain()).isEqualTo(userData.getTenantDomain());
            softAssertions.assertThat(registrationResponse.getStatus()).isEqualTo("ACTIVE");
            softAssertions.assertThat(registrationResponse.getPlan()).isEqualTo("FREE");
            softAssertions.assertThat(registrationResponse.getActive()).isTrue();
            softAssertions.assertThat(registrationResponse.getOwnerId()).isNotNull();

            sleep(1000);

            long totalUsers = DBQuery.getUserCount();
            log.info("Total users in database after sleep: {}", totalUsers);

            UserDocument userInDb = DBQuery.findUserByTenantName(userData.getTenantName());
            log.info("User found by tenantName '{}': {}", userData.getTenantName(), userInDb != null ? "YES" : "NO");

            log.warn("User not found in database after 5 seconds. Total users: {}", totalUsers);

            UserDocument userByEmail = DBQuery.findUserByEmail(userData.getEmail());
            log.info("User found by email '{}': {}", userData.getEmail(), userByEmail != null ? "YES" : "NO");

            softAssertions.assertThat(userInDb).isNotNull();
            softAssertions.assertThat(userInDb.getEmail()).isEqualTo(userData.getEmail());
            softAssertions.assertThat(userInDb.getFirstName()).isEqualTo(userData.getFirstName());
            softAssertions.assertThat(userInDb.getLastName()).isEqualTo(userData.getLastName());
            softAssertions.assertThat(userInDb.getTenantId()).isNotNull();
            softAssertions.assertThat(userInDb.getTenantDomain()).isEqualTo(userData.getTenantDomain());
            softAssertions.assertThat(userInDb.getStatus()).isEqualTo("ACTIVE");
            softAssertions.assertThat(userInDb.getLoginProvider()).isEqualTo("LOCAL");
            softAssertions.assertThat(userInDb.getEmailVerified()).isFalse();
            softAssertions.assertThat(userInDb.getPasswordHash()).isNotNull();
            softAssertions.assertThat(userInDb.getId()).isNotNull().isEqualTo(registrationResponse.getOwnerId());
            softAssertions.assertThat(userInDb.getRoles()).isNotNull().contains("OWNER");
        });

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

        ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, newUser);

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
    @DisplayName("Should fail registration with duplicate email")
    void shouldFailRegistrationWithDuplicateEmail() {

        UserRegistrationBuilder firstUser = UserRegistrationBuilder.random();
        Response firstResponse = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, firstUser);
        assertEquals(HTTP_OK, firstResponse.getStatusCode());

        UserRegistrationBuilder duplicateUser = UserRegistrationBuilder.random();
        duplicateUser.setEmail(firstUser.getEmail());
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, duplicateUser);

        assertEquals(HTTP_BAD_REQUEST, response.getStatusCode());

        ErrorResponse errorResponse = response.as(ErrorResponse.class);
        assertThat(errorResponse.getCode()).isIn("VALIDATION_ERROR", "BAD_REQUEST");
        assertThat(errorResponse.getMessage()).isNotNull();

        log.info("Registration correctly failed for duplicate email: {}", firstUser.getEmail());
    }
}
