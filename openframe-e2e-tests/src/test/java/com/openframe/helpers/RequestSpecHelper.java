package com.openframe.helpers;

import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;

import static com.openframe.helpers.AuthHelper.getCookies;

public class RequestSpecHelper {

    public static RequestSpecification getAuthorizedSpec() {
        return new RequestSpecBuilder()
                .addCookies(getCookies())
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
