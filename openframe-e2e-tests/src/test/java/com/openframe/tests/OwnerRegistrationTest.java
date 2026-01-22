package com.openframe.tests;

import com.openframe.data.dto.user.MeResponse;
import com.openframe.data.dto.user.User;
import com.openframe.data.dto.user.UserRegistrationRequest;
import com.openframe.data.dto.user.UserRegistrationResponse;
import com.openframe.tests.base.UnauthorizedTest;
import org.junit.jupiter.api.*;

import java.util.List;

import static com.openframe.api.OrganizationApi.getOrganizationNames;
import static com.openframe.api.RegistrationApi.registerUser;
import static com.openframe.api.UserApi.me;
import static com.openframe.config.EnvironmentConfig.USER_FILE;
import static com.openframe.data.generator.RegistrationGenerator.newUserRegistrationRequest;
import static com.openframe.data.generator.RegistrationGenerator.newUserRegistrationResponse;
import static com.openframe.util.FileManager.save;
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
        User registeredUser = User.fromRegistration(userRegistrationRequest, response);
        save(USER_FILE, registeredUser);
    }

    @Order(2)
    @Test
    @DisplayName("Login registered user")
    public void testLoginNewUser() {
        MeResponse response = me();
        assertThat(response.getUser().getId()).isNotNull();
    }

    @Order(3)
    @Test
    @DisplayName("Check that default organization is created")
    public void testDefaultOrganizationCreated() {
        List<String> orgNames = getOrganizationNames();
        assertThat(orgNames).hasSize(1);
        assertThat(orgNames.getFirst()).isEqualTo("Default");
    }
}
