package com.openframe.data.generator;

import com.openframe.data.dto.auth.AuthParts;
import com.openframe.data.dto.user.ResetConfirmRequest;
import com.openframe.data.dto.user.User;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import static com.openframe.config.UserConfig.NEW_PASSWORD;

public class AuthGenerator {

    public static ResetConfirmRequest resetConfirmRequest(String token) {
        return ResetConfirmRequest.builder()
                .token(token)
                .newPassword(NEW_PASSWORD)
                .build();
    }

    public static Map<String, String> clearedCookies() {
        return Map.of(
                "access_token", "",
                "refresh_token", "",
                "JSESSIONID", "");
    }

    public static AuthParts generateAuthParts(User user) {
        String codeVerifier = generateCodeVerifier();
        return AuthParts.builder()
                .email(user.getEmail())
                .password(user.getPassword())
                .tenantId(user.getTenantId())
                .state(generateState())
                .codeVerifier(codeVerifier)
                .codeChallenge(generateCodeChallenge(codeVerifier))
                .build();
    }

    private static String generateCodeVerifier() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate code challenge", e);
        }
    }

    private static String generateState() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
