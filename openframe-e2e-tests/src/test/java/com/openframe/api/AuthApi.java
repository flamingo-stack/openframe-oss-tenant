package com.openframe.api;

import com.openframe.data.dto.auth.AuthParts;
import io.restassured.response.Response;

import java.util.HashMap;
import java.util.Map;

import static com.openframe.config.EnvironmentConfig.DEFAULT_BASE_URL;
import static com.openframe.config.EnvironmentConfig.getBaseUrl;
import static io.restassured.RestAssured.given;

public class AuthApi {

    private static final String OAUTH_LOGIN = "oauth/login";
    private static final String REDIRECT_TO_DASHBOARD = "dashboard";
    private static final String OAUTH_CALLBACK = "oauth/callback";
    private static final String OAUTH2_AUTHORIZE = "sas/%s/oauth2/authorize";
    private static final String CLIENT_ID = "openframe-gateway";
    private static final String SAS_LOGIN = "sas/login";

    public static Response startOAuthFlow(AuthParts authParts) {
        Map<String, String> queryParams = Map.of(
                "tenantId", authParts.getTenantId(),
                "redirectTo", getBaseUrl().concat(REDIRECT_TO_DASHBOARD));
        return given()
                .queryParams(queryParams)
                .redirects().follow(false)
                .when()
                .get(OAUTH_LOGIN);
    }

    public static Response initiateAuthorization(AuthParts authParts) {
        Map<String, Object> queryParams = getAuthQueryParams(authParts);
        return given()
                .cookies(authParts.getCookies())
                .queryParams(queryParams)
                .redirects().follow(false)
                .when()
                .get(OAUTH2_AUTHORIZE.formatted(authParts.getTenantId()));
    }

    public static Response submitCredentials(AuthParts authParts) {
        Map<String, Object> formParams = Map.of(
                "username", authParts.getEmail(),
                "password", authParts.getPassword());
        return given()
                .baseUri(DEFAULT_BASE_URL)
                .cookie("JSESSIONID", authParts.getCookies().get("JSESSIONID"))
                .formParams(formParams)
                .redirects().follow(false)
                .when()
                .post(SAS_LOGIN);
    }

    public static Response getAuthorizationCode(AuthParts authParts) {
        Map<String, Object> queryParams = getAuthQueryParams(authParts);
        queryParams.put("continue", "");
        return given()
                .cookies(authParts.getCookies())
                .queryParams(queryParams)
                .redirects().follow(false)
                .when()
                .get(OAUTH2_AUTHORIZE.formatted(authParts.getTenantId()));
    }

    public static Response exchangeCodeForTokens(AuthParts authParts) {
        Map<String, String> queryParams = Map.of(
                "code", authParts.getAuthorizationCode(),
                "state", authParts.getState());
        return given()
                .cookies(authParts.getCookies())
                .queryParams(queryParams)
                .redirects().follow(false)
                .when()
                .get(OAUTH_CALLBACK);
    }

    private static Map<String, Object> getAuthQueryParams(AuthParts authParts) {
        Map<String, Object> queryParams = new HashMap<>();
        queryParams.put("response_type", "code");
        queryParams.put("client_id", CLIENT_ID);
        queryParams.put("code_challenge", authParts.getCodeChallenge());
        queryParams.put("code_challenge_method", "S256");
        queryParams.put("redirect_uri", DEFAULT_BASE_URL.concat(OAUTH_CALLBACK));
        queryParams.put("scope", "openid profile email offline_access");
        queryParams.put("state", authParts.getState());
        return queryParams;
    }
}
