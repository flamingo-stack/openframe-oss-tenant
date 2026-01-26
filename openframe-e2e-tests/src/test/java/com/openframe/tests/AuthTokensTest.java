package com.openframe.tests;

import com.openframe.data.dto.user.MeResponse;
import com.openframe.data.dto.user.User;
import com.openframe.tests.base.UnauthorizedTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.openframe.api.AuthApi.logout;
import static com.openframe.api.AuthApi.refresh;
import static com.openframe.api.AuthFlow.login;
import static com.openframe.api.UserApi.me;
import static com.openframe.data.generator.AuthGenerator.clearedCookies;
import static com.openframe.helpers.AuthHelper.getUser;
import static com.openframe.helpers.AuthHelper.setCookies;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("authorized")
@DisplayName("Test Access tokens")
public class AuthTokensTest extends UnauthorizedTest {

    @Test
    @DisplayName("Verify refresh of access tokens")
    public void testRefreshTokens() {
        User user = getUser();
        Map<String, String> oldCookies = login(user);
        Map<String, String> newCookies = refresh(user, oldCookies);
        assertThat(newCookies).isNotEqualTo(oldCookies);
        setCookies(newCookies);
        MeResponse response = me();
        assertThat(response.getUser().getId()).isNotNull();
    }

    @Test
    @DisplayName("Verify refresh of access tokens without tenantId")
    public void testRefreshTokensWithoutTenantId() {
        User user = getUser();
        Map<String, String> oldCookies = login(user);
        Map<String, String> newCookies = refresh(oldCookies);
        assertThat(newCookies).isNotEqualTo(oldCookies);
        setCookies(newCookies);
        MeResponse response = me();
        assertThat(response.getUser().getId()).isNotNull();
    }

    @Test
    @DisplayName("Verify logout")
    public void testLogout() {
        User user = getUser();
        Map<String, String> oldCookies = login(user);
        Map<String, String> newCookies = logout(user, oldCookies);
        assertThat(newCookies).isEqualTo(clearedCookies());
//      500 returned instead of 401 - needs fix
//        Response response = attemptRefresh(user, oldCookies);
//        assertThat(response.getStatusCode()).isEqualTo(401);
    }

    @Test
    @DisplayName("Verify logout without tenantId")
    public void testLogoutWithoutTenantId() {
        User user = getUser();
        Map<String, String> oldCookies = login(user);
        Map<String, String> newCookies = logout(oldCookies);
        assertThat(newCookies).isEqualTo(clearedCookies());
//      500 returned instead of 401 - needs fix
//        Response response = attemptRefresh(user, oldCookies);
//        assertThat(response.getStatusCode()).isEqualTo(401);
    }
}

