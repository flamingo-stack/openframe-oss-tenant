package com.openframe.tests.ordered;

import com.openframe.api.OrganizationApi;
import com.openframe.api.RegistrationApi;
import com.openframe.api.UserApi;
import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.MeResponse;
import com.openframe.data.dto.response.OAuthTokenResponse;
import com.openframe.data.dto.response.RegistrationResponse;
import com.openframe.data.dto.test.User;
import com.openframe.support.helpers.RequestSpecHelper;
import com.openframe.tests.ordered.base.UnauthorizedTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;

import static com.openframe.data.testData.OAuthLoginTestData.performCompleteLogin;
import static com.openframe.data.testData.UserRegistrationDataGenerator.meResponse;
import static com.openframe.support.constants.TestConstants.USER_FILE;
import static com.openframe.support.utils.FileManager.read;
import static com.openframe.support.utils.FileManager.save;
import static org.assertj.core.api.Assertions.assertThat;

// This test class will be executed before all other tests

@Tag("start")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class NewRegistrationTest extends UnauthorizedTest {

    @Order(1)
    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#registerNewUser")
    public void registerNewUser(UserRegistrationRequest user, RegistrationResponse expectedResponse) {
        RegistrationResponse response = RegistrationApi.registerUser(user);
        assertThat(response.getId()).isNotNull();
        assertThat(response.getOwnerId()).isNotNull();
        assertThat(response.getCreatedAt()).isNotNull();
        assertThat(response.getUpdatedAt()).isNotNull();
        assertThat(response).usingRecursiveComparison()
                .ignoringFields("id", "ownerId", "hubspotId", "createdAt", "updatedAt")
                .isEqualTo(expectedResponse);
        User registeredUser = User.fromRegistration(user, response);
        save(USER_FILE, registeredUser);
    }

    @Order(2)
    @Test
    public void loginNewUser() {
        User user = read(USER_FILE, User.class);
        OAuthTokenResponse tokens = performCompleteLogin(user);
        RequestSpecHelper.setTokens(tokens);
        MeResponse response = UserApi.me();
        assertThat(response.getUser().getId()).isNotNull();
        assertThat(response).usingRecursiveComparison()
                .ignoringFields("user.password", "user.id")
                .isEqualTo(meResponse(user));
    }

    @Order(3)
    @Test
    public void defaultOrganizationCreated() {
        List<String> orgNames = OrganizationApi.getOrganizationNames();
        assertThat(orgNames.size()).isEqualTo(1);
        assertThat(orgNames.getFirst()).isEqualTo("Default");
    }
}
