package com.openframe.tests;

import com.openframe.data.dto.user.*;
import com.openframe.tests.base.UnauthorizedTest;
import org.junit.jupiter.api.*;

import java.util.List;

import static com.openframe.api.AuthFlow.login;
import static com.openframe.api.OrganizationApi.getOrganizationNames;
import static com.openframe.api.RegistrationApi.registerUser;
import static com.openframe.api.UserApi.*;
import static com.openframe.data.generator.AuthGenerator.resetConfirmRequest;
import static com.openframe.data.generator.RegistrationGenerator.*;
import static com.openframe.helpers.AuthHelper.*;
import static com.openframe.redis.Redis.getResetToken;
import static org.assertj.core.api.Assertions.assertThat;

// This test class will be executed before all other tests

@Tag("start")
@DisplayName("Owner User registration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OwnerRegistrationTest extends UnauthorizedTest {

    @Order(1)
    @Test
    @DisplayName("Register New Owner user")
    public void testRegisterNewUser() {
        UserRegistrationRequest userRegistrationRequest = newUserRegistrationRequest();
        UserRegistrationResponse expectedResponse = newUserRegistrationResponse(userRegistrationRequest);
        UserRegistrationResponse response = registerUser(userRegistrationRequest);
        assertThat(response.getId()).isNotNull();
        assertThat(response.getOwnerId()).isNotNull();
        assertThat(response.getCreatedAt()).isNotNull();
        assertThat(response.getUpdatedAt()).isNotNull();
        assertThat(response).usingRecursiveComparison()
                .ignoringFields("id", "ownerId", "hubspotId", "createdAt", "updatedAt")
                .isEqualTo(expectedResponse);
        saveUser(registeredOwner(userRegistrationRequest, response));
    }

    @Order(2)
    @Test
    @DisplayName("Verify that user can reset password")
    public void testResetPassword() {
        User user = getUser();
        resetPassword(user);
        String token = getResetToken(user.getEmail());
        assertThat(token).isNotNull();
        ResetConfirmRequest confirmRequest = resetConfirmRequest(token);
        confirmReset(confirmRequest);
        user.setPassword(confirmRequest.getNewPassword());
        saveUser(user);
        MeResponse me = me();
        assertThat(me.isAuthenticated()).isTrue();
    }

    @Order(3)
    @Test
    @DisplayName("Login registered user")
    public void testLoginNewUser() {
        setCookies(login(getUser()));
        MeResponse response = me();
        assertThat(response.isAuthenticated()).isTrue();
    }

    @Order(4)
    @Test
    @DisplayName("Check that default organization is created")
    public void testDefaultOrganizationCreated() {
        List<String> orgNames = getOrganizationNames();
        assertThat(orgNames).hasSize(1);
        assertThat(orgNames.getFirst()).isEqualTo("Default");
    }
}
