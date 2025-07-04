package com.openframe.client.service.auth;

import com.openframe.security.jwt.JwtService;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class RefreshTokenGenerator {

    private final JwtService jwtService;
    private int expirationSeconds;
    @Getter
    private long maxRefreshCount;

    public RefreshTokenGenerator(
            JwtService jwtService,
            @Value("${security.oauth2.token.refresh.expiration-seconds}") int expirationSeconds,
            @Value("${security.oauth2.token.refresh.max-refresh-count}") int maxRefreshCount
    ) {
        this.jwtService = jwtService;
        this.expirationSeconds = expirationSeconds;
        this.maxRefreshCount = maxRefreshCount;
    }

    public String generate(String clientId) {
        JwtClaimsSet claims = buildClaims(clientId);
        return jwtService.generateToken(claims);
    }

    private JwtClaimsSet buildClaims(String clientId) {
        return JwtClaimsSet.builder()
                .subject(clientId)
                .claim("refresh_count", 0L)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(expirationSeconds))
                .build();
    }

    public String generateNext(String clientId, long refreshCount) {
        JwtClaimsSet claims = buildNextTokenClaims(clientId, refreshCount);
        return jwtService.generateToken(claims);
    }

    private JwtClaimsSet buildNextTokenClaims(String clientId, long refreshCount) {
        return JwtClaimsSet.builder()
                .subject(clientId)
                .claim("refresh_count", refreshCount + 1)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(expirationSeconds))
                .build();
    }

}
