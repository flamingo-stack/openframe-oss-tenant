package com.openframe.security.pkce;

import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Utility class for PKCE (Proof Key for Code Exchange) operations.
 * Provides methods for generating code verifiers, challenges, and state parameters.
 */
@Slf4j
public final class PKCEUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PKCEUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Generates a cryptographically secure random state parameter.
     * Used to prevent CSRF attacks in OAuth2 flows.
     * 
     * @return Base64URL encoded state string (16 bytes = 128 bits)
     */
    public static String generateState() {
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        return base64UrlEncode(bytes);
    }

    /**
     * Generates a cryptographically secure random code verifier.
     * Used for PKCE (Proof Key for Code Exchange) in OAuth2 flows.
     * 
     * @return Base64URL encoded code verifier (32 bytes = 256 bits)
     */
    public static String generateCodeVerifier() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return base64UrlEncode(bytes);
    }

    /**
     * Generates a code challenge from a code verifier using SHA-256.
     * The challenge is sent to the authorization server, while the verifier
     * is kept secret and sent during token exchange.
     * 
     * @param codeVerifier the code verifier to generate challenge from
     * @return Base64URL encoded code challenge
     * @throws IllegalStateException if SHA-256 algorithm is not available
     */
    public static String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return base64UrlEncode(hash);
        } catch (Exception e) {
            log.error("Failed to compute PKCE challenge", e);
            throw new IllegalStateException("Failed to compute PKCE challenge", e);
        }
    }

    /**
     * URL encodes a string using UTF-8 encoding.
     * 
     * @param value the string to encode
     * @return URL encoded string
     */
    public static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Encodes bytes to Base64URL format (without padding, with URL-safe characters).
     * 
     * @param bytes the bytes to encode
     * @return Base64URL encoded string
     */
    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
