package com.openframe.api;

import com.openframe.data.dto.auth.AuthParts;
import com.openframe.data.dto.user.User;
import com.openframe.util.StringUtils;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

import static com.openframe.api.AuthApi.*;
import static com.openframe.data.generator.AuthGenerator.generateAuthParts;

@Slf4j
public class AuthFlow {

    private final AuthParts authParts;

    private AuthFlow(User user) {
        authParts = generateAuthParts(user);
    }

    public static Map<String, String> login(User user) {
        return new AuthFlow(user)
                .startFlow()
                .initAuth()
                .postCredentials()
                .getAuthCode()
                .extractTokens();
    }

    private AuthFlow startFlow() {
        Response response = startOAuthFlow(authParts);
        response.then().statusCode(302);
        String location = response.getHeader("Location");
        String serverState = StringUtils.extractQueryParam(location, "state");
        String serverCodeChallenge = StringUtils.extractQueryParam(location, "code_challenge");
        Map<String, String> cookies = new HashMap<>(response.getCookies());
        authParts.setState(serverState);
        authParts.setCodeChallenge(serverCodeChallenge);
        authParts.setCookies(cookies);
        return this;
    }

    private AuthFlow initAuth() {
        Response response = initiateAuthorization(authParts);
        response.then().statusCode(302);
        Map<String, String> newCookies = response.getCookies();
        authParts.getCookies().putAll(newCookies);
        return this;
    }

    private AuthFlow postCredentials() {
        Response response = submitCredentials(authParts);
        response.then().statusCode(302);
        Map<String, String> newCookies = response.getCookies();
        authParts.getCookies().putAll(newCookies);
        return this;
    }

    private AuthFlow getAuthCode() {
        Response response = getAuthorizationCode(authParts);
        response.then().statusCode(302);
        String location = response.getHeader("Location");
        String authorizationCode = StringUtils.extractQueryParam(location, "code");
        authParts.setAuthorizationCode(authorizationCode);
        return this;
    }

    private Map<String, String> extractTokens() {
        Response response = exchangeCodeForTokens(authParts);
        response.then().statusCode(302);
        Map<String, String> responseCookies = response.getCookies();
        Map<String, String> cookies = new HashMap<>();
        if (responseCookies.containsKey("access_token")) {
            cookies.put("access_token", responseCookies.get("access_token"));
        }
        if (responseCookies.containsKey("refresh_token")) {
            cookies.put("refresh_token", responseCookies.get("refresh_token"));
        }
        return cookies;
    }
}
