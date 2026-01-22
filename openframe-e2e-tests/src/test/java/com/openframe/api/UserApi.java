package com.openframe.api;

import com.openframe.data.dto.user.MeResponse;

import static com.openframe.helpers.RequestSpecHelper.getAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class UserApi {

    private static final String ME = "api/me";
    private static final String USERS = "api/users";

    public static MeResponse me() {
        return given(getAuthorizedSpec())
                .get(ME)
                .then().statusCode(200)
                .extract().as(MeResponse.class);
    }

    public static int deleteUser(String userId) {
        final String DELETE_USER = USERS.concat("/").concat(userId);
        return given(getAuthorizedSpec())
                .delete(DELETE_USER).statusCode();
    }
}
