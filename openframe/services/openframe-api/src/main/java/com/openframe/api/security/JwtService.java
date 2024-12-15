package com.openframe.api.security;

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
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .subject(userDetails.getUsername())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
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
        Jwt jwt = decoder.decode(token);
        String username = jwt.getSubject();
        return username.equals(userDetails.getUsername()) && !jwt.getExpiresAt().isBefore(Instant.now());
    }
} 