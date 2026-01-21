package com.openframe.api;

import com.openframe.data.dto.auth.AuthParts;
import com.openframe.data.dto.auth.AuthTokens;
import com.openframe.data.dto.user.User;
import com.openframe.util.CookieManager;
import com.openframe.util.StringUtils;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;

import static com.openframe.api.AuthApi.*;
import static com.openframe.data.generator.AuthGenerator.generateAuthParts;

@Slf4j
public class AuthFlow {

    private final AuthParts authParts;

    private AuthFlow(User user) {
        authParts = generateAuthParts(user);
    }

    public static AuthTokens login(User user) {
        return new AuthFlow(user)
                .startFlow()
                .initAuth()
                .postCredentials()
                .getAuthCode()
                .extractTokens();
    }

    private AuthFlow startFlow() {
        Response response = startOAuthFlow(authParts);
        String location = response.getHeader("Location");
        String serverState = StringUtils.extractQueryParam(location, "state");
        String serverCodeChallenge = StringUtils.extractQueryParam(location, "code_challenge");
        String cookies = CookieManager.extractCookiesAsString(response);
        authParts.setState(serverState);
        authParts.setCodeChallenge(serverCodeChallenge);
        authParts.setCookies(cookies);
        return this;
    }

    private AuthFlow initAuth() {
        Response response = initiateAuthorization(authParts);
        String cookies = CookieManager.mergeCookieStrings(authParts.getCookies(), CookieManager.extractCookiesAsString(response));
        authParts.setCookies(cookies);
        return this;
    }

    private AuthFlow postCredentials() {
        Response response = submitCredentials(authParts);
        String cookies = CookieManager.mergeCookieStrings(authParts.getCookies(), CookieManager.extractCookiesAsString(response));
        authParts.setCookies(cookies);
        return this;
    }

    private AuthFlow getAuthCode() {
        Response response = getAuthorizationCode(authParts);
        String location = response.getHeader("Location");
        String authorizationCode = StringUtils.extractQueryParam(location, "code");
        authParts.setAuthorizationCode(authorizationCode);
        return this;
    }

    private AuthTokens extractTokens() {
        Response response = exchangeCodeForTokens(authParts);
        String finalCookies = CookieManager.extractCookiesAsString(response);
        String accessToken = CookieManager.extractCookieValue(finalCookies, "access_token");
        String refreshToken = CookieManager.extractCookieValue(finalCookies, "refresh_token");
        return new AuthTokens(accessToken, refreshToken, finalCookies);
    }
}
