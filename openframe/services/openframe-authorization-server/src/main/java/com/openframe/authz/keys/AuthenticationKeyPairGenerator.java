package com.openframe.authz.keys;

/**
 * Abstraction for generating public/private key pairs used for JWT signing.
 */
public interface AuthenticationKeyPairGenerator {
    AuthenticationKeyPair generate();
}
