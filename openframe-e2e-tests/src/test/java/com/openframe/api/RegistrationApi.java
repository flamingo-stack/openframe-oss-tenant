package com.openframe.api;

import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.data.dto.response.RegistrationResponse;
import io.restassured.http.ContentType;

import static io.restassured.RestAssured.given;

public class RegistrationApi {

    private static final String REGISTER = "sas/oauth/register";

    public static RegistrationResponse registerUser(UserRegistrationRequest user) {
        return given().contentType(ContentType.JSON)
                .body(user).post(REGISTER)
                .then().statusCode(200)
                .extract().as(RegistrationResponse.class);
    }

    public static ErrorResponse attemptRegistration(UserRegistrationRequest user) {
        return given().contentType(ContentType.JSON)
                .body(user).post(REGISTER)
                .then().statusCode(400)
                .extract().as(ErrorResponse.class);
    }
}
