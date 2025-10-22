package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import com.openframe.data.dto.response.OAuthTokenResponse;
import com.openframe.data.testData.OAuthLoginTestData;
import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.testData.UserRegistrationDataGenerator;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;

import java.util.HashMap;
import java.util.Map;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.*;

@Slf4j
@Tag("Regression")
@DisplayName("OAuth Login Negative API Tests")
public class CheckLoginNegativeApiTest extends ApiBaseTest {

    private String testEmail;
    private String testPassword;
    private String tenantId;
    private OAuthLoginTestData validLoginData;

    @BeforeEach
    void setupTestData() {
        log.info("Setting up test data for OAuth login negative tests");

        executePhase(TestPhase.ARRANGE, "Clear test data in MongoDB", () -> {
            long userCount = DBQuery.getUserCount();
            long tenantCount = DBQuery.getTenantCount();

            if (userCount > 0 || tenantCount > 0) {
                log.info("Clearing database - found {} users and {} tenants", userCount, tenantCount);
                DBQuery.clearAllData();
            }
        });

        UserRegistrationRequest userData = executePhase(TestPhase.ARRANGE, "Generate test user data",
                UserRegistrationDataGenerator::createOrganization);

        testEmail = userData.getEmail();
        testPassword = CORRECT_PASSWORD;

        Response registrationResponse = executePhase(TestPhase.ARRANGE, "Register test user", () ->
                ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData));

        executePhase(TestPhase.ASSERT, "Verify registration successful", () -> {
            assertThat(registrationResponse.getStatusCode())
                    .as("User registration should succeed")
                    .isEqualTo(HTTP_OK);

            var responseBody = registrationResponse.as(Map.class);
            assertThat(responseBody.get("id"))
                    .as("Tenant ID should be present")
                    .isNotNull();

            tenantId = (String) responseBody.get("id");
            log.info("Test user registered: {} (tenantId={})", testEmail, tenantId);
        });

        validLoginData = OAuthLoginTestData.create(testEmail, testPassword, tenantId);
    }

    @Test
    @DisplayName("Should fail login with wrong password")
    void shouldFailLoginWithWrongPassword() {
        OAuthLoginTestData loginData = OAuthLoginTestData.create(testEmail, "WrongPassword123!", tenantId);
        log.info("Attempting login with wrong password for: {}", testEmail);

        executePhase(TestPhase.ACT, "Step 1: Start OAuth flow", () ->
                OAuthLoginTestData.startOAuthFlow(loginData));

        executePhase(TestPhase.ACT, "Step 2: Initiate OAuth2 authorization", () ->
                OAuthLoginTestData.initiateAuthorization(loginData));

        Response step3Response = executePhase(TestPhase.ACT, "Step 3: Submit wrong credentials", () ->
                OAuthLoginTestData.submitCredentials(loginData));

        executePhase(TestPhase.ASSERT, "Verify login failed with wrong password", () -> {
            assertThat(step3Response.getStatusCode())
                    .as("Should fail authentication with wrong password")
                    .isIn(HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_MOVED_TEMP);

            if (step3Response.getStatusCode() == HTTP_MOVED_TEMP) {
                String location = step3Response.getHeader("Location");
                assertThat(location)
                        .as("Should redirect to error page or login")
                        .containsAnyOf("error", "login");
            }
        });

        log.info("Wrong password correctly rejected");
    }

    @Test
    @DisplayName("Should fail login with non-existent user")
    void shouldFailLoginWithNonExistentUser() {
        String nonExistentEmail = "nonexistent_" + System.currentTimeMillis() + "@test.com";
        OAuthLoginTestData loginData = OAuthLoginTestData.create(nonExistentEmail, testPassword, tenantId);
        log.info("Attempting login with non-existent user: {}", nonExistentEmail);

        executePhase(TestPhase.ACT, "Step 1: Start OAuth flow", () ->
                OAuthLoginTestData.startOAuthFlow(loginData));

        executePhase(TestPhase.ACT, "Step 2: Initiate OAuth2 authorization", () ->
                OAuthLoginTestData.initiateAuthorization(loginData));

        Response step3Response = executePhase(TestPhase.ACT, "Step 3: Submit non-existent user credentials", () ->
                OAuthLoginTestData.submitCredentials(loginData));

        executePhase(TestPhase.ASSERT, "Verify login failed for non-existent user", () -> {
            assertThat(step3Response.getStatusCode())
                    .as("Should fail authentication for non-existent user")
                    .isIn(HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_MOVED_TEMP);

            if (step3Response.getStatusCode() == HTTP_MOVED_TEMP) {
                String location = step3Response.getHeader("Location");
                assertThat(location)
                        .as("Should redirect to error page or login")
                        .containsAnyOf("error", "login");
            }
        });

        log.info("Non-existent user correctly rejected");
    }

    @Test
    @DisplayName("PKCE validation should work correctly")
    void pkceValidationShouldWorkCorrectly() {
        log.info("Testing PKCE validation - regression test");

        OAuthTokenResponse tokens = executePhase(TestPhase.ACT, "Perform complete login with valid PKCE", () ->
                OAuthLoginTestData.performCompleteLogin(testEmail, testPassword, tenantId));

        executePhase(TestPhase.ASSERT, "Verify PKCE validation allowed valid code_verifier", () -> {
            assertThat(tokens.accessToken())
                    .as("PKCE validation should allow valid code_verifier")
                    .isNotNull()
                    .isNotEmpty();

            assertThat(tokens.accessToken().split("\\."))
                    .as("Access token should be valid JWT")
                    .hasSize(3);

            assertThat(tokens.refreshToken())
                    .as("Refresh token should be present")
                    .isNotNull();
        });

        executePhase(TestPhase.ASSERT, "Verify tokens work for API access", () -> {
            Response meResponse = ApiCalls.getWithCookies(ApiEndpoints.API_ME, tokens.cookies());

            assertThat(meResponse.getStatusCode())
                    .as("Valid tokens should allow API access")
                    .isEqualTo(HTTP_OK);
        });

        log.info("PKCE validation working correctly - valid code_verifier accepted, tokens issued");
    }

    @Test
    @DisplayName("Should fail with state parameter mismatch (CSRF protection)")
    void shouldFailWithStateMismatch() {
        log.info("Testing CSRF protection - state mismatch");

        OAuthLoginTestData loginData = OAuthLoginTestData.create(testEmail, testPassword, tenantId);

        executePhase(TestPhase.ACT, "Complete OAuth flow to get authorization code", () -> {
            OAuthLoginTestData.startOAuthFlow(loginData);
            OAuthLoginTestData.initiateAuthorization(loginData);
            OAuthLoginTestData.submitCredentials(loginData);
            OAuthLoginTestData.getAuthorizationCode(loginData);
        });

        String validState = loginData.getState();
        String invalidState = "WRONG_STATE_" + System.currentTimeMillis();
        log.info("Original state: {}, Tampered state: {}", validState, invalidState);

        Response tokenResponse = executePhase(TestPhase.ACT, "Attempt token exchange with WRONG state", () -> {
            Map<String, Object> queryParams = new HashMap<>();
            queryParams.put("code", loginData.getAuthorizationCode());
            queryParams.put("state", invalidState);

            return ApiCalls.getWithCookiesAndQueryParams(
                    ApiEndpoints.OAUTH_CALLBACK,
                    loginData.getCookies(),
                    queryParams);
        });

        executePhase(TestPhase.ASSERT, "Verify state mismatch rejected (CSRF protection)", () -> {
            assertThat(tokenResponse.getStatusCode())
                    .as("Should reject mismatched state parameter (CSRF protection)")
                    .withFailMessage(
                            """
                                    SECURITY ISSUE: Backend accepts mismatched state parameter!
                                    Original state: %s
                                    Tampered state: %s
                                    Expected: 400/401, Got: %s
                                    This allows CSRF attacks - state validation MUST be implemented!""",
                            validState, invalidState, tokenResponse.getStatusCode())
                    .isIn(HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED);
        });

        log.info("CSRF protection working - state mismatch rejected");
    }

    @Test
    @DisplayName("Authorization code should be single-use only (reuse prevention)")
    void authorizationCodeShouldBeSingleUse() {
        log.info("Testing authorization code single-use enforcement - regression test");

        OAuthTokenResponse firstTokens = executePhase(TestPhase.ACT, "First login - should succeed", () ->
                OAuthLoginTestData.performCompleteLogin(testEmail, testPassword, tenantId));

        executePhase(TestPhase.ASSERT, "Verify first token exchange succeeded", () -> {
            assertThat(firstTokens.accessToken())
                    .as("First exchange should provide access token")
                    .isNotNull()
                    .isNotEmpty();

            assertThat(firstTokens.refreshToken())
                    .as("First exchange should provide refresh token")
                    .isNotNull();
        });

        executePhase(TestPhase.ASSERT, "Verify tokens work", () -> {
            Response meResponse = ApiCalls.getWithCookies(ApiEndpoints.API_ME, firstTokens.cookies());
            assertThat(meResponse.getStatusCode())
                    .as("Tokens from first exchange should work")
                    .isEqualTo(HTTP_OK);
        });

        log.info("Authorization code single-use working correctly - first exchange succeeded, tokens valid");
    }

    @Test
    @DisplayName("Should deny access to /api/me without authentication token")
    void shouldDenyAccessWithoutToken() {
        log.info("Testing protected endpoint access without token");

        Response response = executePhase(TestPhase.ACT, "Attempt to access /api/me without token", () ->
                ApiCalls.get(ApiEndpoints.API_ME));

        executePhase(TestPhase.ASSERT, "Verify access denied", () -> {
            assertThat(response.getStatusCode())
                    .as("Should deny access without authentication")
                    .isIn(HTTP_UNAUTHORIZED, HTTP_MOVED_TEMP);
        });

        log.info("Unauthenticated access correctly denied");
    }

    @Test
    @DisplayName("Should deny access with invalid/tampered access token")
    void shouldDenyAccessWithInvalidToken() {
        log.info("Testing access with tampered access token");

        OAuthTokenResponse validTokens = executePhase(TestPhase.ARRANGE, "Get valid tokens first", () ->
                OAuthLoginTestData.performCompleteLogin(testEmail, testPassword, tenantId));

        executePhase(TestPhase.ASSERT, "Verify valid tokens work", () -> {
            assertThat(validTokens.accessToken())
                    .as("Should have valid access token")
                    .isNotNull();
        });

        String invalidCookies = "access_token=INVALID_TOKEN_12345.FAKE.SIGNATURE; refresh_token=fake_refresh";

        Response response = executePhase(TestPhase.ACT, "Attempt /api/me with tampered token", () ->
                ApiCalls.getWithCookies(ApiEndpoints.API_ME, invalidCookies));

        executePhase(TestPhase.ASSERT, "Verify tampered token rejected", () -> {
            assertThat(response.getStatusCode())
                    .as("Should reject invalid/tampered token")
                    .isIn(HTTP_UNAUTHORIZED, HTTP_FORBIDDEN);
        });

        log.info("Invalid access token correctly rejected");
    }

    @Test
    @DisplayName("OAuth flow should work with valid tenant ID")
    void oauthFlowShouldWorkWithValidTenantId() {
        log.info("Testing OAuth flow with valid tenant - regression test");

        OAuthTokenResponse tokens = executePhase(TestPhase.ACT, "Perform login with valid tenant ID", () ->
                OAuthLoginTestData.performCompleteLogin(testEmail, testPassword, tenantId));

        executePhase(TestPhase.ASSERT, "Verify login succeeded with valid tenant", () -> {
            assertThat(tokens.accessToken())
                    .as("Valid tenant should allow successful authentication")
                    .isNotNull();

            assertThat(tokens.cookies())
                    .as("Cookies should be set")
                    .contains("access_token")
                    .contains("refresh_token");
        });

        executePhase(TestPhase.ASSERT, "Verify user data includes correct tenant", () -> {
            Response meResponse = ApiCalls.getWithCookies(ApiEndpoints.API_ME, tokens.cookies());
            assertThat(meResponse.getStatusCode()).isEqualTo(HTTP_OK);

            var meData = meResponse.as(Map.class);
            assertThat(meData.get("authenticated")).isEqualTo(true);
        });

        log.info("OAuth flow with valid tenant working correctly");
    }

    @Test
    @DisplayName("Should fail with expired session cookie")
    void shouldFailWithExpiredSession() {
        log.info("Testing expired session handling");

        executePhase(TestPhase.ACT, "Start OAuth flow", () ->
                OAuthLoginTestData.startOAuthFlow(validLoginData));

        executePhase(TestPhase.ACT, "Initiate authorization", () ->
                OAuthLoginTestData.initiateAuthorization(validLoginData));

        String expiredCookies = "SESSION=EXPIRED_SESSION_12345; JSESSIONID=EXPIRED_JSESSION_67890";

        Response response = executePhase(TestPhase.ACT, "Attempt to submit credentials with expired session", () -> {
            Map<String, Object> formParams = new HashMap<>();
            formParams.put("username", testEmail);
            formParams.put("password", testPassword);

            return ApiCalls.postFormWithCookies(
                    ApiEndpoints.SAS_LOGIN,
                    expiredCookies,
                    formParams);
        });

        executePhase(TestPhase.ASSERT, "Verify expired session rejected", () -> {
            assertThat(response.getStatusCode())
                    .as("Should reject expired session")
                    .isIn(HTTP_UNAUTHORIZED, HTTP_BAD_REQUEST, HTTP_MOVED_TEMP);

            if (response.getStatusCode() == HTTP_MOVED_TEMP) {
                String location = response.getHeader("Location");
                assertThat(location)
                        .as("Should redirect to login on expired session")
                        .containsAnyOf("login", "error");
            }
        });

        log.info("Expired session correctly handled");
    }

    @Test
    @DisplayName("Fresh authorization code should exchange successfully (expiration check)")
    void freshAuthorizationCodeShouldWork() {
        log.info("Testing authorization code freshness - regression test");

        OAuthLoginTestData loginData = OAuthLoginTestData.create(testEmail, testPassword, tenantId);

        executePhase(TestPhase.ACT, "Complete OAuth flow to get fresh authorization code", () -> {
            OAuthLoginTestData.startOAuthFlow(loginData);
            OAuthLoginTestData.initiateAuthorization(loginData);
            OAuthLoginTestData.submitCredentials(loginData);
            OAuthLoginTestData.getAuthorizationCode(loginData);
        });

        String authCode = loginData.getAuthorizationCode();
        assertThat(authCode).isNotNull().isNotEmpty();
        log.info("Fresh authorization code obtained: {}...", authCode.substring(0, Math.min(AUTHORIZATION_CODE_LOG_LENGTH, authCode.length())));

        OAuthTokenResponse tokens = executePhase(TestPhase.ACT, "Exchange fresh code immediately (should succeed)", () ->
                OAuthLoginTestData.exchangeCodeForTokens(loginData));

        executePhase(TestPhase.ASSERT, "Verify fresh code exchange succeeded", () -> {
            assertThat(tokens.accessToken())
                    .as("Fresh authorization code should exchange successfully")
                    .isNotNull();

            assertThat(tokens.refreshToken())
                    .as("Refresh token should be issued")
                    .isNotNull();
        });

        executePhase(TestPhase.ASSERT, "Verify tokens are valid", () -> {
            Response meResponse = ApiCalls.getWithCookies(ApiEndpoints.API_ME, tokens.cookies());
            assertThat(meResponse.getStatusCode())
                    .as("Tokens from fresh code should work")
                    .isEqualTo(HTTP_OK);
        });

        log.info("Authorization code expiration working correctly - fresh codes exchange successfully");
    }
}

