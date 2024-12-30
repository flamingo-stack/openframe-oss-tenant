package com.openframe.security.jwt;

import java.time.Instant;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {
    
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;
    
    public Jwt decodeToken(String token) {
        log.debug("Decoding token");
        Jwt jwt = decoder.decode(token);
        log.debug("Token decoded successfully - Expiration: {}", jwt.getExpiresAt());
        return jwt;
    }

    private <T> T extractClaim(String token, Function<Jwt, T> claimsResolver) {
        final Jwt jwt = decodeToken(token);
        return claimsResolver.apply(jwt);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, jwt -> jwt.getExpiresAt().isBefore(Instant.now()));
    }

    public String generateToken(UserDetails userDetails) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .subject(userDetails.getUsername())
            .claim("email", userDetails.getUsername())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
            .build();
        
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    
    public String generateToken(JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    
    public String extractUsername(String token) {
        log.debug("Extracting username from token");
        try {
            Jwt jwt = decoder.decode(token);
            String email = jwt.getClaimAsString("email");
            log.debug("Extracted email from token: {}", email);
            return email;
        } catch (Exception e) {
            log.error("Failed to extract email from token: {}", e.getMessage());
            return null;
        }
    }
    
    public boolean isTokenValid(String token, UserDetails userDetails) {
        log.debug("Validating token for user: {}", userDetails.getUsername());
        try {
            Jwt jwt = decoder.decode(token);
            String tokenEmail = jwt.getClaimAsString("email");
            log.debug("Token email: {}, User email: {}", tokenEmail, userDetails.getUsername());
            
            boolean emailValid = tokenEmail != null && tokenEmail.equals(userDetails.getUsername());
            boolean notExpired = !jwt.getExpiresAt().isBefore(Instant.now());
            
            log.debug("Email valid: {}, Not expired: {}", emailValid, notExpired);
            return emailValid && notExpired;
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }
} 