package com.openframe.api;

import com.openframe.data.dto.user.MeResponse;
import com.openframe.data.dto.user.ResetConfirmRequest;
import com.openframe.data.dto.user.User;

import java.util.Map;

import static com.openframe.helpers.RequestSpecHelper.getAuthorizedSpec;
import static com.openframe.helpers.RequestSpecHelper.getUnAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class UserApi {

    private static final String ME = "api/me";
    private static final String USERS = "api/users";
    private static final String PASSWORD_RESET = "sas/password-reset/request";
    private static final String CONFIRM_RESET = "sas/password-reset/confirm";

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

    public static void resetPassword(User user) {
        given(getUnAuthorizedSpec())
                .body(Map.of("email", user.getEmail()))
                .post(PASSWORD_RESET)
                .then().statusCode(202);
    }

    public static void confirmReset(ResetConfirmRequest request) {
        given(getUnAuthorizedSpec())
                .body(request)
                .post(CONFIRM_RESET)
                .then().statusCode(204);
    }
}
