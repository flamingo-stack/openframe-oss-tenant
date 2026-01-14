package com.openframe.api;

import com.openframe.data.dto.response.MeResponse;

import static com.openframe.support.helpers.RequestSpecHelper.getAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class UserApi {

    private static final String ME = "api/me";

    public static MeResponse me() {
        return given(getAuthorizedSpec())
                .get(ME)
                .then().statusCode(200)
                .extract().as(MeResponse.class);
    }
}
