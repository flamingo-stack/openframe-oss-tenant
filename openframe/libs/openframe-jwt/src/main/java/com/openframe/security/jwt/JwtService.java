package com.openframe.security.jwt;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {
    
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    public Jwt decodeToken(String token) {
        log.debug("Decoding token");
        Jwt jwt = decoder.decode(token);
        log.debug("Token decoded successfully - Expiration: {}", jwt.getExpiresAt());
        return jwt;
    }

    public String generateToken(JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
} 