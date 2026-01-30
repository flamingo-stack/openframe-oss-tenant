package com.openframe.api;

import com.openframe.data.dto.error.ErrorResponse;
import com.openframe.data.dto.user.UserRegistrationRequest;
import com.openframe.data.dto.user.UserRegistrationResponse;
import io.restassured.http.ContentType;

import static com.openframe.helpers.RequestSpecHelper.getUnAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class RegistrationApi {

    private static final String REGISTER = "sas/oauth/register";

    public static UserRegistrationResponse registerUser(UserRegistrationRequest user) {
        return given(getUnAuthorizedSpec()).contentType(ContentType.JSON)
                .body(user).post(REGISTER)
                .then().statusCode(200)
                .extract().as(UserRegistrationResponse.class);
    }

    public static ErrorResponse attemptRegistration(UserRegistrationRequest user) {
        return given(getUnAuthorizedSpec()).contentType(ContentType.JSON)
                .body(user).post(REGISTER)
                .then().statusCode(400)
                .extract().as(ErrorResponse.class);
    }
}
