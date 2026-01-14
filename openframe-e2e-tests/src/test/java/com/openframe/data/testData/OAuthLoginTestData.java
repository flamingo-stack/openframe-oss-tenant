package com.openframe.data.testData;

import com.openframe.data.dto.response.OAuthTokenResponse;
import com.openframe.data.dto.test.User;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import com.openframe.support.utils.CookieManager;
import com.openframe.support.utils.StringUtils;
import io.restassured.response.Response;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static com.openframe.support.constants.TestConstants.*;

@Slf4j
@Data
@Builder
public class OAuthLoginTestData {
    
    // User credentials
    private String email;
    private String password;
    private String tenantId;
    
    // OAuth PKCE parameters (mutable during flow)
    private String state;
    private String codeChallenge;
    private String codeVerifier;
    
    // Session data (mutable during flow)
    private String cookies;
    
    // OAuth flow results (mutable during flow)
    private String authorizationCode;
    
    /**
     * Create OAuth login data with auto-generated PKCE parameters
     */
    public static OAuthLoginTestData create(String email, String password, String tenantId) {
        String codeVerifier = generateCodeVerifier();
        String codeChallenge = generateCodeChallenge(codeVerifier);
        String state = generateState();
        
        return OAuthLoginTestData.builder()
                .email(email)
                .password(password)
                .tenantId(tenantId)
                .codeVerifier(codeVerifier)
                .codeChallenge(codeChallenge)
                .state(state)
                .build();
    }

    /**
     * Perform complete OAuth login flow and get tokens
     * High-level method for quick authentication in tests
     * 
     * @param email user email
     * @param password user password
     * @param tenantId tenant ID
     * @return OAuthTokenResponse with access_token, refresh_token, and cookies
     */
    public static OAuthTokenResponse performCompleteLogin(String email, String password, String tenantId) {
        log.info("Starting complete login flow for: {}", email);
        
        OAuthLoginTestData loginData = create(email, password, tenantId);
        
        startOAuthFlow(loginData);
        initiateAuthorization(loginData);
        submitCredentials(loginData);
        getAuthorizationCode(loginData);
        OAuthTokenResponse tokens = exchangeCodeForTokens(loginData);
        
        log.info("Login completed successfully for: {}", email);
        return tokens;
    }

    public static OAuthTokenResponse performCompleteLogin(User user) {
        return performCompleteLogin(user.getEmail(), user.getPassword(), user.getTenantId());
    }

    public static Response startOAuthFlow(OAuthLoginTestData data) {
        log.info("Step 1: Starting OAuth flow for tenant: {}", data.getTenantId());

        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("tenantId", data.getTenantId());
        queryParams.put("redirectTo", ApiEndpoints.REDIRECT_TO_DASHBOARD.getPath());

        Response response = ApiCalls.getWithQueryParams(ApiEndpoints.OAUTH_LOGIN, queryParams);

        // Extract server-generated parameters from Location header
        String location = response.getHeader("Location");
        String serverState = StringUtils.extractQueryParam(location, "state");
        String serverCodeChallenge = StringUtils.extractQueryParam(location, "code_challenge");

        // Extract SESSION cookie
        String cookies = CookieManager.extractCookiesAsString(response);

        // Update data with server values
        data.setState(serverState);
        data.setCodeChallenge(serverCodeChallenge);
        data.setCookies(cookies);

        log.info("Step 1: SESSION obtained, state={}", serverState);
        return response;
    }

    /**
     * Step 2: OAuth2 authorize - get JSESSIONID
     * Updates: cookies (adds JSESSIONID)
     */
    public static Response initiateAuthorization(OAuthLoginTestData data) {
        log.info("Step 2: Initiating OAuth2 authorization");

        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("response_type", "code");
        queryParams.put("client_id", CLIENT_ID);
        queryParams.put("code_challenge", data.getCodeChallenge());
        queryParams.put("code_challenge_method", "S256");
        queryParams.put("redirect_uri", DEFAULT_BASE_URL + ApiEndpoints.OAUTH_CALLBACK.getPath());
        queryParams.put("scope", "openid profile email offline_access");
        queryParams.put("state", data.getState());

        Response response = ApiCalls.getWithCookiesAndQueryParams(
                ApiEndpoints.OAUTH2_AUTHORIZE, 
                data.getCookies(), 
                queryParams, 
                data.getTenantId());

        // Merge cookies (SESSION + JSESSIONID)
        String newCookies = CookieManager.mergeCookieStrings(data.getCookies(), CookieManager.extractCookiesAsString(response));
        data.setCookies(newCookies);

        log.info("Step 2: JSESSIONID obtained");
        return response;
    }

    /**
     * Step 3: Submit login credentials
     * Updates: cookies, validates redirect
     */
    public static Response submitCredentials(OAuthLoginTestData data) {
        log.info("Step 3: Submitting credentials for: {}", data.getEmail());

        Map<String, Object> formParams = new HashMap<>();
        formParams.put("username", data.getEmail());
        formParams.put("password", data.getPassword());

        Response response = ApiCalls.postFormWithCookies(
                ApiEndpoints.SAS_LOGIN, 
                data.getCookies(), 
                formParams);

        // Merge cookies
        String newCookies = CookieManager.mergeCookieStrings(data.getCookies(), CookieManager.extractCookiesAsString(response));
        data.setCookies(newCookies);

        String redirectUrl = response.getHeader("Location");
        log.info("Step 3: Login successful, redirect to: {}", redirectUrl);

        return response;
    }

    /**
     * Step 4: Follow redirect and get authorization code
     * Updates: authorizationCode, cookies
     */
    public static Response getAuthorizationCode(OAuthLoginTestData data) {
        log.info("Step 4: Getting authorization code");

        // Build authorize URL with current parameters
        String authorizeUrl = String.format("%s?response_type=code&client_id=%s&code_challenge=%s&code_challenge_method=S256&redirect_uri=%s&scope=openid%%20profile%%20email%%20offline_access&state=%s&continue",
                ApiEndpoints.OAUTH2_AUTHORIZE.getPathWithParams(data.getTenantId()),
                CLIENT_ID,
                data.getCodeChallenge(),
                DEFAULT_BASE_URL + ApiEndpoints.OAUTH_CALLBACK.getPath(),
                data.getState());

        Response response = ApiCalls.getWithCookiesNoEncoding(authorizeUrl, data.getCookies());

        // Extract code from redirect
        String location = response.getHeader("Location");
        String code = StringUtils.extractQueryParam(location, "code");

        data.setAuthorizationCode(code);

        log.info("Step 4: Authorization code: {}...", code.substring(0, Math.min(AUTHORIZATION_CODE_LOG_LENGTH, code.length())));
        return response;
    }

    /**
     * Step 5: Exchange code for tokens
     */
    public static OAuthTokenResponse exchangeCodeForTokens(OAuthLoginTestData data) {
        log.info("Step 5: Exchanging code for tokens");

        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("code", data.getAuthorizationCode());
        queryParams.put("state", data.getState());

        Response response = ApiCalls.getWithCookiesAndQueryParams(
                ApiEndpoints.OAUTH_CALLBACK, 
                data.getCookies(), 
                queryParams);

        // Extract cookies with tokens
        String finalCookies = CookieManager.extractCookiesAsString(response);
        String accessToken = CookieManager.extractCookieValue(finalCookies, "access_token");
        String refreshToken = CookieManager.extractCookieValue(finalCookies, "refresh_token");

        log.info("Step 5: Tokens obtained (access_token={}, refresh_token={})",
                accessToken != null ? "present" : "missing",
                refreshToken != null ? "present" : "missing");

        return new OAuthTokenResponse(accessToken, refreshToken, finalCookies);
    }

    // ============ PKCE Generators ============
    
    private static String generateCodeVerifier() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    
    private static String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate code challenge", e);
        }
    }
    
    private static String generateState() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
