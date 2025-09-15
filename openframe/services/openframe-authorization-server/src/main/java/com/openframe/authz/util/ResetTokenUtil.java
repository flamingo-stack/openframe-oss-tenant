package com.openframe.authz.util;

import java.security.SecureRandom;
import java.util.Base64;

public final class ResetTokenUtil {

    private static final SecureRandom secureRandom = new SecureRandom();
    private static final Base64.Encoder base64Url = Base64.getUrlEncoder().withoutPadding();

    private ResetTokenUtil() {
    }

    public static String generateResetToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return base64Url.encodeToString(bytes);
    }
}


