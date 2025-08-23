package com.openframe.authz.keys;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Value object holding generated RSA key material and PEM encodings.
 */
public record AuthenticationKeyPair(
        RSAPublicKey publicKey,
        RSAPrivateKey privateKey,
        String publicPem,
        String privatePem
) {}


