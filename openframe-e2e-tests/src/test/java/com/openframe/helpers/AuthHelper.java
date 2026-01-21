package com.openframe.helpers;

import com.openframe.data.dto.user.User;

import java.util.Map;

import static com.openframe.api.AuthFlow.login;
import static com.openframe.config.EnvironmentConfig.USER_FILE;
import static com.openframe.util.FileManager.read;

public class AuthHelper {

    private static User user;
    private static Map<String, String> cookies;

    public static Map<String, String> getCookies() {
        if (user == null) {
            user = read(USER_FILE, User.class);
            cookies = login(user);
        }
        return cookies;
    }
}
