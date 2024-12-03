package com.openframe.api.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    public String generateToken(UserDetails userDetails) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .issuedAt(now)
            .expiresAt(now.plus(1, ChronoUnit.DAYS))
            .subject(userDetails.getUsername())
            .claim("roles", userDetails.getAuthorities())
            .build();

        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String generateToken(JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String extractUsername(String token) {
        return decoder.decode(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        Jwt jwt = decoder.decode(token);
        return username.equals(userDetails.getUsername()) && 
               !jwt.getExpiresAt().isBefore(Instant.now());
    }

    public boolean validateToken(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            return !jwt.getExpiresAt().isBefore(Instant.now());
        } catch (Exception e) {
            return false;
        }
    }

    public String extractMachineId(String token) {
        return decoder.decode(token).getSubject();
    }
} 