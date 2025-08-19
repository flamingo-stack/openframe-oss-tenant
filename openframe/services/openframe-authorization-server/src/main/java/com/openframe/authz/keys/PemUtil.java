package com.openframe.authz.keys;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public final class PemUtil {
    private PemUtil() {
    }

    public static RSAPublicKey parsePublicKey(String pem) {
        try {
            String content = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "").replaceAll("\\s", "");
            byte[] bytes = Base64.getDecoder().decode(content);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(bytes);
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid public key PEM", e);
        }
    }

    public static RSAPrivateKey parsePrivateKey(String pem) {
        try {
            String content = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "").replaceAll("\\s", "");
            byte[] bytes = Base64.getDecoder().decode(content);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(bytes);
            return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(spec);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid private key PEM", e);
        }
    }

    public static String toPublicPem(RSAPublicKey key) {
        String base64 = Base64.getEncoder().encodeToString(key.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + wrap(base64) + "\n-----END PUBLIC KEY-----\n";
    }

    public static String toPrivatePem(RSAPrivateKey key) {
        String base64 = Base64.getEncoder().encodeToString(key.getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + wrap(base64) + "\n-----END PRIVATE KEY-----\n";
    }

    private static String wrap(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i += 64) {
            sb.append(s, i, Math.min(i + 64, s.length())).append('\n');
        }
        return sb.toString().trim();
    }
}


