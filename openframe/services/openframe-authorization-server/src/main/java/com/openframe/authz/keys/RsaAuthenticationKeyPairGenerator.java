package com.openframe.authz.keys;

import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Component
public class RsaAuthenticationKeyPairGenerator implements AuthenticationKeyPairGenerator {

    @Override
    public AuthenticationKeyPair generate() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            KeyPair kp = kpg.generateKeyPair();
            RSAPublicKey pub = (RSAPublicKey) kp.getPublic();
            RSAPrivateKey priv = (RSAPrivateKey) kp.getPrivate();
            String publicPem = PemUtil.toPublicPem(pub);
            String privatePem = PemUtil.toPrivatePem(priv);
            return new AuthenticationKeyPair(pub, priv, publicPem, privatePem);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate RSA key pair", e);
        }
    }
}


