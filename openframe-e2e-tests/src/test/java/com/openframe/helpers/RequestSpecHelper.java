package com.openframe.helpers;

import com.openframe.data.dto.auth.AuthTokens;
import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;

public class RequestSpecHelper {

    private static final ThreadLocal<AuthTokens> tokens = new ThreadLocal<>();

    public static void setTokens(AuthTokens authTokens) {
        tokens.set(authTokens);
    }

    public static RequestSpecification getAuthorizedSpec() {
        return new RequestSpecBuilder()
                .addHeader("Cookie", tokens.get().cookies())
                .setContentType(ContentType.JSON)
                .addFilter(new AllureRestAssured())
                .build();
    }

    public static RequestSpecification getUnAuthorizedSpec() {
        return new RequestSpecBuilder()
                .setContentType(ContentType.JSON)
                .addFilter(new AllureRestAssured())
                .build();
    }
}
