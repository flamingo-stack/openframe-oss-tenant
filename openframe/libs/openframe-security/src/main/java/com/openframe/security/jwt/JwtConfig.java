package com.openframe.security.jwt;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@EnableConfigurationProperties
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {

    private KeyConfig publicKey;
    private KeyConfig privateKey;
    private String issuer;
    private String audience;

    public RSAPublicKey loadPublicKey() throws Exception {
        return publicKey.toRSAPublicKey();
    }

    public RSAPrivateKey loadPrivateKey() throws Exception {
        String privateKeyPEM = privateKey.getValue()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
        return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
    }

    // Getters and setters
    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getAudience() {
        return audience;
    }

    public void setAudience(String audience) {
        this.audience = audience;
    }

    public KeyConfig getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(KeyConfig publicKey) {
        this.publicKey = publicKey;
    }

    public KeyConfig getPrivateKey() {
        return privateKey;
    }

    public void setPrivateKey(KeyConfig privateKey) {
        this.privateKey = privateKey;
    }

}
