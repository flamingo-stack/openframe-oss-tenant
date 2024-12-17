package com.openframe.core.security.config;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.util.FileCopyUtils;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;

@Configuration
@EnableConfigurationProperties
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {
    private String issuer;
    private String audience;
    private KeyConfig publicKey;
    private KeyConfig privateKey;

    @Bean
    public JwtEncoder jwtEncoder() throws Exception {
        RSAPublicKey rsaPublicKey = loadPublicKey();
        RSAPrivateKey rsaPrivateKey = loadPrivateKey();
        
        RSAKey rsaKey = new RSAKey.Builder(rsaPublicKey)
            .privateKey(rsaPrivateKey)
            .build();
            
        JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(new JWKSet(rsaKey));
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder() throws Exception {
        RSAPublicKey rsaPublicKey = loadPublicKey();
        return NimbusJwtDecoder.withPublicKey(rsaPublicKey).build();
    }

    private RSAPublicKey loadPublicKey() throws Exception {
        String pemContent = readKeyFile(publicKey.getKey());
        String publicKeyPEM = pemContent
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replaceAll("\\s", "");
            
        byte[] encoded = Base64.getDecoder().decode(publicKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
        return (RSAPublicKey) keyFactory.generatePublic(keySpec);
    }

    private RSAPrivateKey loadPrivateKey() throws Exception {
        String pemContent = readKeyFile(privateKey.getKey());
        String privateKeyPEM = pemContent
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replaceAll("\\s", "");
            
        byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
        return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
    }

    private String readKeyFile(String path) throws Exception {
        String resourcePath = path.replace("classpath:", "");
        ClassPathResource resource = new ClassPathResource(resourcePath);
        byte[] bytes = FileCopyUtils.copyToByteArray(resource.getInputStream());
        return new String(bytes);
    }

    // Getters and setters
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }
    public KeyConfig getPublicKey() { return publicKey; }
    public void setPublicKey(KeyConfig publicKey) { this.publicKey = publicKey; }
    public KeyConfig getPrivateKey() { return privateKey; }
    public void setPrivateKey(KeyConfig privateKey) { this.privateKey = privateKey; }

    public static class KeyConfig {
        private String key;
        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
    }
} 