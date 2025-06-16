package com.openframe.api.service;

import com.openframe.api.exception.EncryptionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Service
public class EncryptionService {

    @Value("${security.oauth2.client-secret.encryption-key:defaultSecretKey123456}")
    private String encryptionKey;

    private static final String ALGORITHM = "AES";

    /**
     * Gets the secret key spec for AES encryption, handling both base64 and plain text keys
     *
     * @return SecretKeySpec for AES encryption
     */
    private SecretKeySpec getSecretKeySpec() {
        byte[] keyBytes;

        try {
            // Try to decode as base64 first
            keyBytes = Base64.getDecoder().decode(encryptionKey);
            log.debug("Using base64-decoded encryption key of {} bytes", keyBytes.length);
        } catch (IllegalArgumentException e) {
            // If base64 decoding fails, use as plain text and pad/truncate to 32 bytes
            log.warn("Encryption key is not valid base64, treating as plain text");
            byte[] plainBytes = encryptionKey.getBytes(StandardCharsets.UTF_8);
            keyBytes = new byte[32]; // 256-bit key

            // The rest of keyBytes remains zero-filled
            System.arraycopy(plainBytes, 0, keyBytes, 0, Math.min(plainBytes.length, 32));
            log.debug("Using padded/truncated plain text key of {} bytes", keyBytes.length);
        }

        // Validate key length
        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            throw new EncryptionException("invalid_key_length",
                    String.format("Invalid AES key length: %d bytes. Must be 16, 24, or 32 bytes.", keyBytes.length));
        }

        return new SecretKeySpec(keyBytes, ALGORITHM);
    }

    /**
     * Encrypts the given plain text using AES encryption
     *
     * @param plainText the text to encrypt
     * @return encrypted text encoded as Base64 string
     * @throws EncryptionException if encryption fails
     */
    public String encrypt(String plainText) {
        try {
            SecretKeySpec secretKey = getSecretKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);

            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            log.error("Failed to encrypt data", e);
            throw new EncryptionException("encryption_failed", "Failed to encrypt sensitive data", e);
        }
    }

    /**
     * Decrypts the given encrypted text using AES decryption
     *
     * @param encryptedText the Base64 encoded encrypted text
     * @return decrypted plain text
     * @throws EncryptionException if decryption fails
     */
    public String decrypt(String encryptedText) {
        try {
            SecretKeySpec secretKey = getSecretKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);

            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to decrypt data", e);
            throw new EncryptionException("decryption_failed", "Failed to decrypt sensitive data", e);
        }
    }

    /**
     * Encrypts client secret specifically for OAuth configurations
     *
     * @param clientSecret the plain text client secret
     * @return encrypted client secret
     */
    public String encryptClientSecret(String clientSecret) {
        if (clientSecret == null || clientSecret.trim().isEmpty()) {
            throw new IllegalArgumentException("Client secret cannot be null or empty");
        }

        log.debug("Encrypting client secret for OAuth configuration");
        return encrypt(clientSecret);
    }

    /**
     * Decrypts client secret specifically for OAuth configurations
     *
     * @param encryptedClientSecret the encrypted client secret
     * @return decrypted client secret
     */
    public String decryptClientSecret(String encryptedClientSecret) {
        if (encryptedClientSecret == null || encryptedClientSecret.trim().isEmpty()) {
            throw new IllegalArgumentException("Encrypted client secret cannot be null or empty");
        }

        log.debug("Decrypting client secret for OAuth configuration");
        return decrypt(encryptedClientSecret);
    }
} 