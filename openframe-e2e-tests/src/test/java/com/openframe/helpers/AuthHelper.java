package com.openframe.helpers;

import com.openframe.data.dto.user.User;

import java.util.Map;

import static com.openframe.api.AuthFlow.login;
import static com.openframe.config.UserConfig.USER_FILE;
import static com.openframe.util.FileManager.read;
import static com.openframe.util.FileManager.save;

public class AuthHelper {

    private static User user;
    private static Map<String, String> cookies;

    public static void saveUser(User registeredUser) {
        save(USER_FILE, registeredUser);
    }

    public static User getUser() {
        if (user == null) {
            user = read(USER_FILE, User.class);
        }
        return user;
    }

    public static Map<String, String> getCookies() {
        if (cookies == null) {
            user = getUser();
            cookies = login(user);
        }
        return cookies;
    }

    public static void setCookies(Map<String, String> newCookies) {
        cookies = newCookies;
    }

}
