package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.dto.TenantDocument;
import com.openframe.data.dto.UserDocument;
import com.openframe.data.dto.response.TenantDiscoverResponse;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.enums.TestPhase;
import com.openframe.support.helpers.ApiCalls;
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Slf4j
@DisplayName("Login Flow Tests")
public class CheckLoginTempTest extends ApiBaseTest {
    
    // OAuth2 constants
    private static final String REDIRECT_TO = "https://localhost/dashboard";
    private static final String CLIENT_ID = "openframe-gateway";
    private static final String REDIRECT_URI = "https://localhost/oauth/callback";
    private static final String SCOPE = "openid profile email offline_access";
    private static final String CODE_CHALLENGE = "Adw7Vp_DmAaaCHFNEQqLkKFm_FzTUeyd3lwwdr_urAs";
    private static final String STATE = "9_MS_8aVOKB5ehpN6LVEZw";

    // Test user data (created via registration API)
    private static final String TEST_USER_EMAIL = "logintest@openframe.com";
    private static final String TEST_USER_PASSWORD = "Password123!";
    private static final String TEST_USER_FIRST_NAME = "Login";
    private static final String TEST_USER_LAST_NAME = "Test";
    private static final String TEST_TENANT_NAME = "LoginTestTenant";

    // Runtime variables - using String for manual cookie management
    private String cookieHeader;
    private String accessToken;
    private String refreshToken;
    private String authorizationCode;
    private String tenantId;
    
    @BeforeAll
    static void configureRestAssured() {
        // Configure RestAssured with relaxed SSL for self-signed certificates
        RestAssured.config = RestAssuredConfig.config()
                .sslConfig(SSLConfig.sslConfig().relaxedHTTPSValidation());
        
        log.info("RestAssured configured with SSL validation disabled");
    }
    
    @BeforeEach
    void setupTestData() {
        log.info("Setting up test data for login flow");
        
        // Clear database before test
        executePhase(TestPhase.ARRANGE, "Clear test data in MongoDB", this::clearDataInMongo);
        
        // Create test user via registration API (this also creates tenant)
            UserRegistrationBuilder userData = executePhase(TestPhase.ARRANGE, "Generate test user data", () ->
                    UserRegistrationBuilder.builder()
                            .email(TEST_USER_EMAIL)
                            .firstName(TEST_USER_FIRST_NAME)
                            .lastName(TEST_USER_LAST_NAME)
                            .password(TEST_USER_PASSWORD)
                            .tenantName(TEST_TENANT_NAME)
                            .tenantDomain("localhost")
                            .build()
            );

            // Register user through API with SSL config (using configured RestAssured)
            Response registrationResponse = executePhase(TestPhase.ACT, "Register test user via API", () ->
                    given()
                            .contentType("application/json")
                            .body(userData)
                            .when()
                            .post(ApiEndpoints.REGISTRATION_ENDPOINT.getPath()));
        
        // Verify registration successful
        executePhase(TestPhase.ASSERT, "Verify user registration successful", () -> {
            assertEquals(HTTP_OK, registrationResponse.getStatusCode(), 
                    "User registration should succeed");
            log.info("Test user registered successfully: {}", TEST_USER_EMAIL);
        });
        
        // Extract tenantId from MongoDB (registration creates both user and tenant)
        UserDocument registeredUser = executePhase(TestPhase.ARRANGE, "Retrieve registered user from MongoDB", () -> {
            UserDocument user = DBQuery.findUserByEmail(TEST_USER_EMAIL);
            assertNotNull(user, "Registered user should exist in MongoDB");
            assertNotNull(user.getTenantId(), "User should have tenantId");
            return user;
        });
        
        tenantId = registeredUser.getTenantId();
        log.info("Test user created with email: {} and tenantId: {}", TEST_USER_EMAIL, tenantId);
    }
    
    private void clearDataInMongo() {
        long userCount = DBQuery.getUserCount();
        long tenantCount = DBQuery.getTenantCount();

        if (userCount > 0 || tenantCount > 0) {
            log.info("Clearing database before login test - found {} users and {} tenants", 
                    userCount, tenantCount);
            DBQuery.clearAllData();
        }
    }
    
    @Test
    @DisplayName("Should complete full login flow")
    void shouldCompleteFullLoginFlow() {
        // tenantId is already set in @BeforeEach after user registration
        log.info("Starting login flow for user: {} with tenantId: {}", TEST_USER_EMAIL, tenantId);
        
        // Step 1: Send tenant discovery request
        Response discoverResponse = executePhase(TestPhase.ACT, "Discover tenant by email", () ->
                discoverTenant(TEST_USER_EMAIL));
        
        // Verify HTTP status code
        executePhase(TestPhase.ASSERT, "Verify tenant discovery status code", () ->
                assertEquals(HTTP_OK, discoverResponse.getStatusCode()));
        
        // Parse tenant discovery response
        TenantDiscoverResponse tenantResponse = executePhase(TestPhase.ACT, "Parse tenant discovery response", () ->
                discoverResponse.as(TenantDiscoverResponse.class));
        
        // Verify email has existing account
        executePhase(TestPhase.ASSERT, "Verify email has existing account", () -> {
            assertThat(tenantResponse.getHasExistingAccounts())
                    .as("User should have existing account")
                    .isTrue();
            assertThat(tenantResponse.getTenantId())
                    .as("TenantId from API should match MongoDB")
                    .isEqualTo(tenantId);
            log.info("Email {} has existing account in tenant: {}", TEST_USER_EMAIL, tenantResponse.getTenantId());
        });
        
        // Step 2: Navigate to OAuth login page with tenantId
        Response loginPageResponse = executePhase(TestPhase.ACT, "Navigate to OAuth login page", () ->
                getOAuthLoginPage(tenantId, REDIRECT_TO));
        
        // Extract state and other OAuth params from redirect Location
        String[] oauthParams = executePhase(TestPhase.ACT, "Extract OAuth parameters from login redirect", () -> {
            assertEquals(HTTP_MOVED_TEMP, loginPageResponse.getStatusCode());
            
            String location = loginPageResponse.getHeader("Location");
            assertNotNull(location, "Location header should be present");
            log.info("🔍 OAuth login redirect to: {}", location);
            
            // Extract dynamically generated state and code_challenge from server
            String serverState = extractQueryParam(location, "state");
            String serverCodeChallenge = extractQueryParam(location, "code_challenge");
            
            assertNotNull(serverState, "Server should generate state");
            log.info("✅ Server-generated state: {}", serverState);
            log.info("✅ Server-generated code_challenge: {}", serverCodeChallenge);
            
            return new String[]{serverState, serverCodeChallenge};
        });
        
        String serverState = oauthParams[0];
        String serverCodeChallenge = oauthParams[1];
        
        // Extract SESSION cookie as string
        cookieHeader = extractCookiesAsString(loginPageResponse);
        log.info("Cookies after login page: {}", cookieHeader);
        
        // Step 3: Initiate OAuth2 authorization with server-generated params
        Response authorizeResponse = executePhase(TestPhase.ACT, "Initiate OAuth2 authorization", () ->
                initiateOAuth2Authorization(tenantId, CLIENT_ID, serverCodeChallenge, REDIRECT_URI, SCOPE, serverState, cookieHeader));
        
        // Verify authorization redirects to login
        executePhase(TestPhase.ASSERT, "Verify OAuth2 authorization redirects to login", () -> {
            log.info("🔍 Authorization response status: {}", authorizeResponse.getStatusCode());
            assertEquals(HTTP_MOVED_TEMP, authorizeResponse.getStatusCode());
            assertEquals("https://localhost/sas/login", authorizeResponse.getHeader("Location"));
        });
        
        // Merge cookies from authorization response (JSESSIONID added here)
        String authCookies = extractCookiesAsString(authorizeResponse);
        log.info("🔍 Extracted from authorization: {}", authCookies);
        cookieHeader = mergeCookieStrings(cookieHeader, authCookies);
        log.info("Cookies after authorization: {}", cookieHeader);
        
        // Step 4a: Follow redirect to login page (GET /sas/login)
        Response loginPageGetResponse = executePhase(TestPhase.ACT, "Navigate to login form page", () ->
                givenWithCookies(cookieHeader)
                        .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .when()
                        .get("/sas/login"));
        
        // Verify login page loaded
        executePhase(TestPhase.ASSERT, "Verify login page loaded", () ->
                assertEquals(HTTP_OK, loginPageGetResponse.getStatusCode()));
        
        // Update cookies if login page returned new ones
        String loginPageCookies = extractCookiesAsString(loginPageGetResponse);
        if (!loginPageCookies.isEmpty()) {
            cookieHeader = mergeCookieStrings(cookieHeader, loginPageCookies);
            log.info("Cookies updated after login page GET: {}", cookieHeader);
        } else {
            log.info("No new cookies from login page GET, keeping: {}", cookieHeader);
        }
        
        // Step 4b: Submit login credentials
        Response loginResponse = executePhase(TestPhase.ACT, "Submit login credentials", () ->
                submitLogin(TEST_USER_EMAIL, TEST_USER_PASSWORD, cookieHeader));
        
        // Verify login redirects back to authorize with continue
        String authorizeWithContinueUrl = executePhase(TestPhase.ASSERT, "Verify login redirects to authorize with continue", () -> {
            String location = loginResponse.getHeader("Location");
            log.info("🔍 Login response Location: {}", location);
            assertEquals(HTTP_MOVED_TEMP, loginResponse.getStatusCode());
            assertThat(location).contains("/oauth2/authorize").contains("&continue");
            return location;
        });
        
        // Merge cookies from login response
        cookieHeader = mergeCookieStrings(cookieHeader, extractCookiesAsString(loginResponse));
        log.info("Cookies after login: {}", cookieHeader);
        
        // Step 5: Follow redirect to authorize with continue (this returns authorization code)
        Response confirmResponse = executePhase(TestPhase.ACT, "Follow redirect to authorize with continue", () -> {
            // Extract path from full URL: https://localhost/sas/.../oauth2/authorize?... → /sas/.../oauth2/authorize?...
            String pathWithQuery = authorizeWithContinueUrl.substring(authorizeWithContinueUrl.indexOf("/sas/"));
            log.info("Following redirect to: {}", pathWithQuery);
            
            // Use URI to prevent double encoding
            return givenWithCookies(cookieHeader)
                    .redirects().follow(false)
                    .urlEncodingEnabled(false) // CRITICAL: Disable encoding since URL is already encoded!
                    .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .when()
                    .get(pathWithQuery);
        });
        
        // Verify confirmation redirects to callback
        executePhase(TestPhase.ASSERT, "Verify authorization confirmation redirects", () -> {
            // May be 200 or 302 redirect
            assertThat(confirmResponse.getStatusCode()).isIn(HTTP_OK, 302);
        });
        
        // Extract authorization code and state from redirect Location header
        String[] codeAndState = executePhase(TestPhase.ACT, "Extract authorization code and state from redirect", () -> {
            String location = confirmResponse.getHeader("Location");
            log.info("🔍 Confirm response Location: {}", location);
            assertNotNull(location, "Location header should be present for redirect");
            
            // Extract code and state parameters from URL: ?code=XXX&state=YYY
            String code = extractQueryParam(location, "code");
            String state = extractQueryParam(location, "state");
            
            assertNotNull(code, "Authorization code should be present in redirect URL");
            assertNotNull(state, "State should be present in redirect URL");
            
            log.info("Authorization code extracted: {}...", code.substring(0, Math.min(20, code.length())));
            log.info("State extracted: {}", state);
            
            return new String[]{code, state};
        });
        
        authorizationCode = codeAndState[0];
        String actualState = codeAndState[1];
        
        log.info("OAuth2 authorization confirmed");
        
        // Step 6: Handle OAuth callback with authorization code and actual state
        Response callbackResponse = executePhase(TestPhase.ACT, "Handle OAuth callback", () ->
                handleOAuthCallback(authorizationCode, actualState, cookieHeader));
        
        // Verify callback redirects with tokens
        executePhase(TestPhase.ASSERT, "Verify OAuth callback redirects", () -> {
            log.info("🔍 Callback response status: {}", callbackResponse.getStatusCode());
            assertEquals(HTTP_MOVED_TEMP, callbackResponse.getStatusCode());
        });
        
        // Extract tokens from cookies - THIS IS WHERE WE GET TOKENS! 🎯
        String tokenCookies = extractCookiesAsString(callbackResponse);
        log.info("🔍 Token cookies extracted: {}", tokenCookies);
        executePhase(TestPhase.ASSERT, "Extract access and refresh tokens from cookies", () -> {
            accessToken = extractCookieValue(tokenCookies, "access_token");
            refreshToken = extractCookieValue(tokenCookies, "refresh_token");
            
            assertNotNull(accessToken, "Access token should be present");
            assertNotNull(refreshToken, "Refresh token should be present");
            
            log.info("🎉 ACCESS TOKEN received: {}...", accessToken.substring(0, Math.min(50, accessToken.length())));
            log.info("🎉 REFRESH TOKEN received: {}...", refreshToken.substring(0, Math.min(50, refreshToken.length())));
            
            assertThat(accessToken).isNotEmpty();
            assertThat(refreshToken).isNotEmpty();
        });
        
        log.info("🚀 Full login flow completed successfully! Tokens captured.");
        
        // Step 7: Verify tokens work by calling authenticated endpoint
        Response meResponse = executePhase(TestPhase.ACT, "Call /api/me to verify tokens", () -> {
            // Build cookie header with SESSION and access_token
            String sessionCookie = extractCookieValue(cookieHeader, "SESSION");
            String apiCookies = "SESSION=" + sessionCookie + "; access_token=" + accessToken;
            log.info("Calling /api/me with cookies: {}", apiCookies.substring(0, Math.min(100, apiCookies.length())) + "...");
            
            return givenWithCookies(apiCookies)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .when()
                    .get(ApiEndpoints.API_ME.getPath());
        });
        
        // Verify /api/me returns 200 OK
        executePhase(TestPhase.ASSERT, "Verify /api/me returns user info", () -> {
            assertEquals(HTTP_OK, meResponse.getStatusCode());
            log.info("✅ /api/me returned 200 OK - tokens are valid!");
            log.info("User info: {}", meResponse.getBody().asString());
        });
    }
    
    /**
     * Helper method to create RestAssured RequestSpecification with proper cookie handling
     * 
     * @param cookieHeader cookie string in format "NAME1=VALUE1; NAME2=VALUE2"
     * @return configured RequestSpecification with proper cookie config
     */
    private io.restassured.specification.RequestSpecification givenWithCookies(String cookieHeader) {
        io.restassured.specification.RequestSpecification spec = given();
        
        if (cookieHeader != null && !cookieHeader.isEmpty()) {
            spec.header("Cookie", cookieHeader);
        }
        
        return spec;
    }
    
    /**
     * Extracts all cookies from Response as a single Cookie header string
     */
    private String extractCookiesAsString(Response response) {
        // Try to get Set-Cookie headers using different approaches
        io.restassured.http.Headers headers = response.getHeaders();
        java.util.List<io.restassured.http.Header> setCookieHeaders = headers.getList("Set-Cookie");
        
        if (setCookieHeaders == null || setCookieHeaders.isEmpty()) {
            log.debug("No Set-Cookie headers found in response");
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
                result.append(parts[0].trim()); // Just "NAME=VALUE"
                log.debug("Extracted cookie: {}", parts[0].trim());
            }
        }
        
        log.info("Extracted cookies: {}", result);
        return result.toString();
    }
    
    /**
     * Merges two cookie strings
     * JSESSIONID comes first, then SESSION (matches browser behavior)
     */
    private String mergeCookieStrings(String existing, String newCookies) {
        if (existing == null || existing.isEmpty()) return newCookies;
        if (newCookies == null || newCookies.isEmpty()) return existing;
        
        // Parse into map
        Map<String, String> cookieMap = new java.util.LinkedHashMap<>();
        
        for (String cookie : (existing + "; " + newCookies).split(";")) {
            String[] parts = cookie.trim().split("=", 2);
            if (parts.length == 2) {
                cookieMap.put(parts[0].trim(), parts[1].trim());
            }
        }
        
        // Build result with JSESSIONID first, then SESSION, then others
        StringBuilder result = new StringBuilder();
        
        // Add JSESSIONID first if present
        if (cookieMap.containsKey("JSESSIONID")) {
            result.append("JSESSIONID=").append(cookieMap.get("JSESSIONID"));
            cookieMap.remove("JSESSIONID");
        }
        
        // Add SESSION second if present  
        if (cookieMap.containsKey("SESSION")) {
            if (result.length() > 0) result.append("; ");
            result.append("SESSION=").append(cookieMap.get("SESSION"));
            cookieMap.remove("SESSION");
        }
        
        // Add remaining cookies
        for (Map.Entry<String, String> entry : cookieMap.entrySet()) {
            if (result.length() > 0) result.append("; ");
            result.append(entry.getKey()).append("=").append(entry.getValue());
        }
        
        return result.toString();
    }
    
    /**
     * Extracts a single cookie value by name
     */
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
    
    /**
     * Discovers tenant by user email
     * GET /sas/tenant/discover?email={email}
     * 
     * @param email user email address
     * @return Response containing tenant information
     */
    private Response discoverTenant(String email) {
        log.info("Discovering tenant for email: {}", email);
        
        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("email", email);
        
        return givenWithCookies(null)
                .queryParams(queryParams)
                .header("accept", "application/json")
                .when()
                .get(ApiEndpoints.TENANT_DISCOVER.getPath());
    }
    
    /**
     * Gets OAuth login page with tenantId and redirect URL
     * GET /oauth/login?tenantId={tenantId}&redirectTo={redirectTo}
     * 
     * Note: redirects(false) is used to capture SESSION cookie from 302 redirect response
     * 
     * @param tenantId tenant identifier
     * @param redirectTo URL to redirect after successful login
     * @return Response containing 302 redirect with SESSION cookie
     */
    private Response getOAuthLoginPage(String tenantId, String redirectTo) {
        log.info("Getting OAuth login page for tenantId: {} with redirectTo: {}", tenantId, redirectTo);
        
        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("tenantId", tenantId);
        queryParams.put("redirectTo", redirectTo);
        
        return given()
                .redirects().follow(false) // Disable auto-redirect to capture SESSION cookie
                .queryParams(queryParams)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(ApiEndpoints.OAUTH_LOGIN.getPath());
    }
    
    /**
     * Initiates OAuth2 authorization with PKCE
     * GET /sas/{tenantId}/oauth2/authorize?response_type=code&client_id={clientId}&...
     * 
     * @param tenantId tenant identifier
     * @param clientId OAuth2 client ID
     * @param codeChallenge PKCE code challenge
     * @param redirectUri callback URI after authorization
     * @param scope OAuth2 scopes
     * @param state state parameter for CSRF protection
     * @param cookieHeader cookies string from previous requests (e.g. "SESSION=xxx; JSESSIONID=yyy")
     * @return Response containing authorization page or redirect
     */
    private Response initiateOAuth2Authorization(String tenantId, String clientId, String codeChallenge,
                                                  String redirectUri, String scope, String state, String cookieHeader) {
        log.info("Initiating OAuth2 authorization for tenantId: {} with client: {}", tenantId, clientId);
        
        String path = ApiEndpoints.OAUTH2_AUTHORIZE.getPathWithParams(tenantId);
        
        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("response_type", "code");
        queryParams.put("client_id", clientId);
        queryParams.put("code_challenge", codeChallenge);
        queryParams.put("code_challenge_method", "S256");
        queryParams.put("redirect_uri", redirectUri);
        queryParams.put("scope", scope);
        queryParams.put("state", state);
        
        return givenWithCookies(cookieHeader)
                .redirects().follow(false) // Don't follow redirect to /sas/login
                .queryParams(queryParams)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(path);
    }
    
    /**
     * Submits login credentials via form POST
     * POST /sas/login with form-data: username and password
     * 
     * Note: redirects(false) is used to capture 302 redirect response with updated cookies
     * 
     * @param username user email
     * @param password user password
     * @param cookieHeader cookies string from previous requests (e.g. "SESSION=xxx; JSESSIONID=yyy")
     * @return Response containing 302 redirect after successful login
     */
    private Response submitLogin(String username, String password, String cookieHeader) {
        log.info("Submitting login credentials for user: {} with cookies: {}", username, cookieHeader);
        log.info("Password: {}", password);
        
        return givenWithCookies(cookieHeader)
                .redirects().follow(false) // Disable auto-redirect to capture cookies from 302
                .contentType("application/x-www-form-urlencoded")
                .formParam("username", username)
                .formParam("password", password)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .post(ApiEndpoints.SAS_LOGIN.getPath());
    }
    
    /**
     * Confirms OAuth2 authorization after successful login (with continue parameter)
     * GET /sas/{tenantId}/oauth2/authorize?...&continue
     * 
     * @param tenantId tenant identifier
     * @param clientId OAuth2 client ID
     * @param codeChallenge PKCE code challenge
     * @param redirectUri callback URI after authorization
     * @param scope OAuth2 scopes
     * @param state state parameter for CSRF protection
     * @param cookieHeader cookies string from previous requests (e.g. "SESSION=xxx; JSESSIONID=yyy")
     * @return Response containing redirect to callback with authorization code
     */
    private Response confirmOAuth2Authorization(String tenantId, String clientId, String codeChallenge,
                                                 String redirectUri, String scope, String state, String cookieHeader) {
        log.info("Confirming OAuth2 authorization for tenantId: {}", tenantId);
        
        String path = ApiEndpoints.OAUTH2_AUTHORIZE.getPathWithParams(tenantId);
        
        return givenWithCookies(cookieHeader)
                .redirects().follow(false) // Don't follow redirects automatically
                .queryParam("response_type", "code")
                .queryParam("client_id", clientId)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", scope)
                .queryParam("state", state)
                .queryParam("continue") // IMPORTANT: continue without value!
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("sec-fetch-user", "?1")
                .header("upgrade-insecure-requests", "1")
                .when()
                .get(path);
    }
    
    /**
     * Handles OAuth callback with authorization code
     * GET /oauth/callback?code={code}&state={state}
     * This is where access_token and refresh_token cookies are set!
     * 
     * @param code authorization code from OAuth flow
     * @param state state parameter for CSRF protection
     * @param cookieHeader cookies string from previous requests (e.g. "SESSION=xxx; JSESSIONID=yyy")
     * @return Response containing tokens in cookies
     */
    private Response handleOAuthCallback(String code, String state, String cookieHeader) {
        log.info("Handling OAuth callback with authorization code");
        
        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("code", code);
        queryParams.put("state", state);
        
        return givenWithCookies(cookieHeader)
                .redirects().follow(false) // Don't follow redirect to capture access_token and refresh_token cookies
                .queryParams(queryParams)
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .when()
                .get(ApiEndpoints.OAUTH_CALLBACK.getPath());
    }
    
    /**
     * Extracts query parameter value from URL
     * 
     * @param url URL string containing query parameters
     * @param paramName name of the parameter to extract
     * @return parameter value or null if not found
     */
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
