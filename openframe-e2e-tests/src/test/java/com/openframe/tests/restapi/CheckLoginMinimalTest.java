package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.dto.UserDocument;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.enums.TestPhase;
import io.restassured.RestAssured;
import io.restassured.config.RestAssuredConfig;
import io.restassured.config.SSLConfig;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static com.openframe.support.constants.TestConstants.HTTP_MOVED_TEMP;
import static com.openframe.support.constants.TestConstants.HTTP_OK;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Minimal login flow test - optimized version without unnecessary steps
 * 
 * Flow:
 * 1. GET /oauth/login → extract server-generated state & code_challenge + SESSION cookie
 * 2. GET /sas/{tenantId}/oauth2/authorize → get JSESSIONID cookie
 * 3. POST /sas/login → submit credentials
 * 4. Follow redirect to /oauth2/authorize?...&continue → get authorization code
 * 5. GET /oauth/callback → exchange code for tokens
 * 6. GET /api/me → verify tokens work
 */
@Slf4j
@DisplayName("Minimal Login Flow Tests")
public class CheckLoginMinimalTest extends ApiBaseTest {

    // OAuth2 constants
    private static final String REDIRECT_TO = "https://localhost/dashboard";
    private static final String CLIENT_ID = "openframe-gateway";
    private static final String REDIRECT_URI = "https://localhost/oauth/callback";
    private static final String SCOPE = "openid profile email offline_access";

    // Test user data
    private static final String TEST_USER_EMAIL = "minimaltest@openframe.com";
    private static final String TEST_USER_PASSWORD = "Password123!";
    private static final String TEST_USER_FIRST_NAME = "Minimal";
    private static final String TEST_USER_LAST_NAME = "Test";
    private static final String TEST_TENANT_NAME = "MinimalTestTenant";

    // Runtime variables
    private String cookieHeader;
    private String accessToken;
    private String refreshToken;
    private String tenantId;

    @BeforeAll
    static void configureRestAssured() {
        RestAssured.config = RestAssuredConfig.config()
                .sslConfig(SSLConfig.sslConfig().relaxedHTTPSValidation());
        
        log.info("RestAssured configured with SSL validation disabled");
    }

    @BeforeEach
    void setupTestData() {
        log.info("Setting up test data for minimal login flow");
        
        // Clear database
        long userCount = DBQuery.getUserCount();
        long tenantCount = DBQuery.getTenantCount();
        
        if (userCount > 0 || tenantCount > 0) {
            log.info("Clearing database - found {} users and {} tenants", userCount, tenantCount);
            DBQuery.clearAllData();
        }
        
        // Create test user via registration API
        UserRegistrationBuilder userData = UserRegistrationBuilder.builder()
                .email(TEST_USER_EMAIL)
                .firstName(TEST_USER_FIRST_NAME)
                .lastName(TEST_USER_LAST_NAME)
                .password(TEST_USER_PASSWORD)
                .tenantName(TEST_TENANT_NAME)
                .tenantDomain("localhost")
                .build();
        
        Response registrationResponse = given()
                .contentType("application/json")
                .body(userData)
                .when()
                .post(ApiEndpoints.REGISTRATION_ENDPOINT.getPath());
        
        assertEquals(HTTP_OK, registrationResponse.getStatusCode(), 
                "User registration should succeed");
        log.info("Test user registered: {}", TEST_USER_EMAIL);
        
        // Get tenantId from MongoDB
        UserDocument registeredUser = DBQuery.findUserByEmail(TEST_USER_EMAIL);
        assertNotNull(registeredUser, "User should exist in MongoDB");
        assertNotNull(registeredUser.getTenantId(), "User should have tenantId");
        
        tenantId = registeredUser.getTenantId();
        log.info("Test user created with tenantId: {}", tenantId);
    }

    @Test
    @DisplayName("Should complete minimal login flow")
    void shouldLoginWithMinimalSteps() {
        log.info("Starting MINIMAL login flow for user: {}", TEST_USER_EMAIL);
        
        // Step 1: Get OAuth login page - extract server-generated params
        Response loginPageResponse = given()
                .redirects().follow(false)
                .queryParam("tenantId", tenantId)
                .queryParam("redirectTo", REDIRECT_TO)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(ApiEndpoints.OAUTH_LOGIN.getPath());
        
        assertEquals(HTTP_MOVED_TEMP, loginPageResponse.getStatusCode());
        
        String location = loginPageResponse.getHeader("Location");
        String serverState = extractQueryParam(location, "state");
        String serverCodeChallenge = extractQueryParam(location, "code_challenge");
        
        cookieHeader = extractCookiesAsString(loginPageResponse);
        log.info("✅ Step 1: SESSION={}, state={}", 
                extractCookieValue(cookieHeader, "SESSION"), serverState);
        
        // Step 2: Initiate OAuth2 authorization - get JSESSIONID
        Response authorizeResponse = given()
                .header("Cookie", cookieHeader)
                .redirects().follow(false)
                .queryParam("response_type", "code")
                .queryParam("client_id", CLIENT_ID)
                .queryParam("code_challenge", serverCodeChallenge)
                .queryParam("code_challenge_method", "S256")
                .queryParam("redirect_uri", REDIRECT_URI)
                .queryParam("scope", SCOPE)
                .queryParam("state", serverState)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(ApiEndpoints.OAUTH2_AUTHORIZE.getPathWithParams(tenantId));
        
        assertEquals(HTTP_MOVED_TEMP, authorizeResponse.getStatusCode());
        
        cookieHeader = mergeCookieStrings(cookieHeader, extractCookiesAsString(authorizeResponse));
        log.info("✅ Step 2: Cookies={}", cookieHeader);
        
        // Step 3: Submit login credentials
        Response loginResponse = given()
                .header("Cookie", cookieHeader)
                .redirects().follow(false)
                .contentType("application/x-www-form-urlencoded")
                .formParam("username", TEST_USER_EMAIL)
                .formParam("password", TEST_USER_PASSWORD)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .post(ApiEndpoints.SAS_LOGIN.getPath());
        
        assertEquals(HTTP_MOVED_TEMP, loginResponse.getStatusCode());
        
        String authorizeWithContinueUrl = loginResponse.getHeader("Location");
        cookieHeader = mergeCookieStrings(cookieHeader, extractCookiesAsString(loginResponse));
        log.info("✅ Step 3: Login successful, redirect to: {}", authorizeWithContinueUrl);
        
        // Step 4: Follow redirect to get authorization code
        String pathWithQuery = authorizeWithContinueUrl.substring(authorizeWithContinueUrl.indexOf("/sas/"));
        
        Response confirmResponse = given()
                .header("Cookie", cookieHeader)
                .redirects().follow(false)
                .urlEncodingEnabled(false)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(pathWithQuery);
        
        String callbackLocation = confirmResponse.getHeader("Location");
        String code = extractQueryParam(callbackLocation, "code");
        String state = extractQueryParam(callbackLocation, "state");
        
        assertNotNull(code, "Authorization code should be present");
        log.info("✅ Step 4: Authorization code: {}...", code.substring(0, 20));
        
        // Step 5: Handle OAuth callback - get tokens
        Response callbackResponse = given()
                .header("Cookie", cookieHeader)
                .redirects().follow(false)
                .queryParam("code", code)
                .queryParam("state", state)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(ApiEndpoints.OAUTH_CALLBACK.getPath());
        
        assertEquals(HTTP_MOVED_TEMP, callbackResponse.getStatusCode());
        
        String tokenCookies = extractCookiesAsString(callbackResponse);
        accessToken = extractCookieValue(tokenCookies, "access_token");
        refreshToken = extractCookieValue(tokenCookies, "refresh_token");
        
        assertNotNull(accessToken, "Access token should be present");
        assertNotNull(refreshToken, "Refresh token should be present");
        
        log.info("🎉 ACCESS TOKEN: {}...", accessToken.substring(0, 50));
        log.info("🎉 REFRESH TOKEN: {}...", refreshToken.substring(0, 50));
        
        // Step 6: Verify tokens with /api/me
        String sessionCookie = extractCookieValue(cookieHeader, "SESSION");
        String apiCookies = "SESSION=" + sessionCookie + "; access_token=" + accessToken;
        
        Response meResponse = given()
                .header("Cookie", apiCookies)
                .header("accept", "application/json")
                .when()
                .get(ApiEndpoints.API_ME.getPath());
        
        assertEquals(HTTP_OK, meResponse.getStatusCode());
        log.info("✅ /api/me: {}", meResponse.getBody().asString());
        log.info("🚀 MINIMAL login flow completed successfully!");
    }

    // ============= Helper Methods =============
    
    private String extractCookiesAsString(Response response) {
        io.restassured.http.Headers headers = response.getHeaders();
        java.util.List<io.restassured.http.Header> setCookieHeaders = headers.getList("Set-Cookie");
        
        if (setCookieHeaders == null || setCookieHeaders.isEmpty()) {
            return "";
        }
        
        StringBuilder result = new StringBuilder();
        for (io.restassured.http.Header header : setCookieHeaders) {
            String setCookie = header.getValue();
            String[] parts = setCookie.split(";");
            if (parts.length > 0) {
                if (result.length() > 0) {
                    result.append("; ");
                }
                result.append(parts[0].trim());
            }
        }
        
        return result.toString();
    }
    
    private String mergeCookieStrings(String existing, String newCookies) {
        if (existing == null || existing.isEmpty()) return newCookies;
        if (newCookies == null || newCookies.isEmpty()) return existing;
        
        Map<String, String> cookieMap = new java.util.LinkedHashMap<>();
        
        for (String cookie : (existing + "; " + newCookies).split(";")) {
            String[] parts = cookie.trim().split("=", 2);
            if (parts.length == 2) {
                cookieMap.put(parts[0].trim(), parts[1].trim());
            }
        }
        
        // JSESSIONID first, then SESSION, then others
        StringBuilder result = new StringBuilder();
        
        if (cookieMap.containsKey("JSESSIONID")) {
            result.append("JSESSIONID=").append(cookieMap.get("JSESSIONID"));
            cookieMap.remove("JSESSIONID");
        }
        
        if (cookieMap.containsKey("SESSION")) {
            if (result.length() > 0) result.append("; ");
            result.append("SESSION=").append(cookieMap.get("SESSION"));
            cookieMap.remove("SESSION");
        }
        
        for (Map.Entry<String, String> entry : cookieMap.entrySet()) {
            if (result.length() > 0) result.append("; ");
            result.append(entry.getKey()).append("=").append(entry.getValue());
        }
        
        return result.toString();
    }
    
    private String extractCookieValue(String cookieString, String cookieName) {
        if (cookieString == null) return null;
        
        for (String cookie : cookieString.split(";")) {
            String[] parts = cookie.trim().split("=", 2);
            if (parts.length == 2 && parts[0].trim().equals(cookieName)) {
                return parts[1].trim();
            }
        }
        
        return null;
    }
    
    private String extractQueryParam(String url, String paramName) {
        if (url == null || !url.contains("?")) {
            return null;
        }
        
        String queryString = url.substring(url.indexOf("?") + 1);
        String[] params = queryString.split("&");
        
        for (String param : params) {
            String[] keyValue = param.split("=", 2);
            if (keyValue.length == 2 && keyValue[0].equals(paramName)) {
                return keyValue[1];
            }
        }
        
        return null;
    }
}

