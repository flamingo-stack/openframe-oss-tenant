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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.openframe.support.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.*;

/**
 * OAuth Flow:
 * 1. Start OAuth → get SESSION cookie & server params
 * 2. Authorize → get JSESSIONID
 * 3. Submit credentials → authenticate user
 * 4. Get authorization code → from redirect
 * 5. Exchange code for tokens → get access_token & refresh_token
 * 6. Verify authentication → call /api/me
 */
@Slf4j
@Tag("smoke")
@DisplayName("Check login Flow ")
public class CheckLoginTest extends ApiBaseTest {

    // Test user credentials (filled in setup)
    private String testEmail;
    private String testPassword;
    private String tenantId;
    
    // OAuth results (available for negative tests)
    private String accessToken;
    private String refreshToken;
    private String cookies;

    @BeforeEach
    void setupTestData() {
        log.info("Setting up test data for minimal login flow");
        
        // Prepare test environment
        executePhase(TestPhase.ARRANGE, "Clear test data in MongoDB", () -> {
            long userCount = DBQuery.getUserCount();
            long tenantCount = DBQuery.getTenantCount();
            
            if (userCount > 0 || tenantCount > 0) {
                log.info("Clearing database - found {} users and {} tenants", userCount, tenantCount);
                DBQuery.clearAllData();
            }
        });
        
        // Generate and register test user
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
    }

    @Test
    @DisplayName("Should complete login flow")
    void shouldLoginWithMinimalSteps() {

        OAuthLoginTestData loginData = OAuthLoginTestData.create(testEmail, testPassword, tenantId);
        log.info("Prepared OAuth login data for: {}", testEmail);

        Response step1Response = executePhase(TestPhase.ACT, "Step 1: Start OAuth flow", () ->
                OAuthLoginTestData.startOAuthFlow(loginData));
        
        executePhase(TestPhase.ASSERT, "Verify OAuth login redirect", () -> {
            assertThat(step1Response.getStatusCode())
                    .as("OAuth login should redirect")
                    .isEqualTo(HTTP_MOVED_TEMP);
        });
        
        Response step2Response = executePhase(TestPhase.ACT, "Step 2: Initiate OAuth2 authorization", () ->
                OAuthLoginTestData.initiateAuthorization(loginData));
        
        executePhase(TestPhase.ASSERT, "Verify OAuth authorize redirect", () -> {
            assertThat(step2Response.getStatusCode())
                    .as("OAuth authorize should redirect")
                    .isEqualTo(HTTP_MOVED_TEMP);
        });
        
        Response step3Response = executePhase(TestPhase.ACT, "Step 3: Submit login credentials", () ->
                OAuthLoginTestData.submitCredentials(loginData));
        
        executePhase(TestPhase.ASSERT, "Verify login redirect", () -> {
            assertThat(step3Response.getStatusCode())
                    .as("Login should redirect")
                    .isEqualTo(HTTP_MOVED_TEMP);
        });
        
        Response step4Response = executePhase(TestPhase.ACT, "Step 4: Get authorization code", () ->
                OAuthLoginTestData.getAuthorizationCode(loginData));
        
        executePhase(TestPhase.ASSERT, "Verify authorization code redirect", () -> {
            assertThat(step4Response.getStatusCode())
                    .as("Should redirect with code")
                    .isEqualTo(HTTP_MOVED_TEMP);
        });
        
        OAuthTokenResponse tokens = executePhase(TestPhase.ACT, "Step 5: Exchange code for tokens", () ->
                OAuthLoginTestData.exchangeCodeForTokens(loginData));
        
        // Save tokens to test fields (for reuse in negative tests)
        this.accessToken = tokens.accessToken();
        this.refreshToken = tokens.refreshToken();
        this.cookies = tokens.cookies();
        
        // Assert - Step 6: Verify authentication works
        executePhase(TestPhase.ASSERT, "Verify user authenticated via /api/me", () -> {
            Response meResponse = ApiCalls.getWithCookies(ApiEndpoints.API_ME, this.cookies);
            
            assertThat(meResponse.getStatusCode())
                    .as("Should access protected endpoint")
                    .isEqualTo(HTTP_OK);
            
            var meData = meResponse.as(Map.class);
            assertThat(meData.get("authenticated"))
                    .as("User should be authenticated")
                    .isEqualTo(true);
            
            Map<String, Object> user = (Map<String, Object>) meData.get("user");
            assertThat(user.get("email"))
                    .as("Email should match")
                    .isEqualTo(testEmail);
            
            log.info("User authenticated successfully: {}", testEmail);
        });
    }
}