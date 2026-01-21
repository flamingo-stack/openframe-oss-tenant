package com.openframe.helpers;

import com.openframe.data.dto.auth.AuthTokens;
import com.openframe.data.dto.user.User;

import static com.openframe.api.AuthFlow.login;
import static com.openframe.config.EnvironmentConfig.USER_FILE;
import static com.openframe.util.FileManager.read;

public class AuthHelper {

    private static ThreadLocal<User> user;
    private static ThreadLocal<AuthTokens> tokens;

    public static AuthTokens authorize() {
        if (user == null) {
            user = new ThreadLocal<>();
            user.set(read(USER_FILE, User.class));
        }
        if (tokens == null) {
            tokens = new ThreadLocal<>();
            tokens.set(login(user.get()));
        }
        return tokens.get();
    }
}
