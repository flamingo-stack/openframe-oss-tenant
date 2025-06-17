package com.openframe.core.service;

import com.openframe.core.exception.EncryptionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EncryptionService {

    private final TextEncryptor textEncryptor;

    public EncryptionService(
            @Value("${security.encryption.password}") String password,
            @Value("${security.encryption.salt}") String salt) {

        if (password == null || password.length() < 32) {
            throw new IllegalArgumentException("Encryption password must be at least 32 characters");
        }

        if (salt == null || salt.length() < 16) {
            throw new IllegalArgumentException("Encryption salt must be at least 16 characters (hex-encoded)");
        }
        
        try {
            this.textEncryptor = Encryptors.text(password, salt);
            log.info("Client secret encryption service initialized with Spring Security Crypto");
        } catch (Exception e) {
            log.error("Failed to initialize encryption service", e);
            throw new IllegalStateException("Could not initialize encryption service", e);
        }
    }

    /**
     * Encrypts the given plain text using Spring Security Crypto (AES-256-CBC + HMAC)
     *
     * @param plainText the text to encrypt
     * @return encrypted text
     * @throws EncryptionException if encryption fails
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.trim().isEmpty()) {
            throw new IllegalArgumentException("Plain text cannot be null or empty");
        }

        try {
            return textEncryptor.encrypt(plainText);
        } catch (Exception e) {
            log.error("Failed to encrypt data", e);
            throw new EncryptionException("encryption_failed", "Failed to encrypt sensitive data", e);
        }
    }

    /**
     * Decrypts the given encrypted text using Spring Security Crypto
     *
     * @param encryptedText the encrypted text
     * @return decrypted plain text
     * @throws EncryptionException if decryption fails
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.trim().isEmpty()) {
            throw new IllegalArgumentException("Encrypted text cannot be null or empty");
        }

        try {
            return textEncryptor.decrypt(encryptedText);
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

        try {
            log.debug("Encrypting client secret for OAuth configuration");
            return encrypt(clientSecret);
        } catch (Exception e) {
            log.error("Failed to encrypt client secret", e);
            throw new EncryptionException("encryption_failed", "Failed to encrypt client secret", e);
        }
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

        try {
            log.debug("Decrypting client secret for OAuth configuration");
            return decrypt(encryptedClientSecret);
        } catch (Exception e) {
            log.error("Failed to decrypt client secret", e);
            throw new EncryptionException("decryption_failed", "Failed to decrypt client secret", e);
        }
    }
} 