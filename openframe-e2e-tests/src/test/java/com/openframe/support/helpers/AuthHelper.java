package com.openframe.support.helpers;

import com.openframe.data.dto.response.OAuthTokenResponse;
import com.openframe.data.dto.test.User;

import static com.openframe.data.testData.OAuthLoginTestData.performCompleteLogin;
import static com.openframe.support.constants.TestConstants.USER_FILE;
import static com.openframe.support.utils.FileManager.read;

public class AuthHelper {

    private static User user;
    private static OAuthTokenResponse tokens;

    public static OAuthTokenResponse authorize() {
        if (user == null) {
            user = read(USER_FILE, User.class);
        }
        if (tokens == null) {
            tokens = performCompleteLogin(user);
        }
        return tokens;
    }
}
