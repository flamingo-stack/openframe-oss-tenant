package com.openframe.client.service;

import com.openframe.client.dto.AgentTokenResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentAuthService {

    private final OAuthClientRepository clientRepository;
    private final JwtService jwtService;

    @Value("${security.oauth2.token.access.expiration-seconds:3600}")
    private int accessTokenExpirationSeconds;

    public AgentTokenResponse authenticateAndIssueToken(String clientId, String clientSecret) {
        OAuthClient client = validateClient(clientId, clientSecret);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("https://auth.openframe.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
                .subject(client.getClientId())
                .claim("grant_type", "client_credentials")
                .claim("scopes", client.getScopes())
                .claim("roles", List.of("USER"))
                .build();

        String accessToken = jwtService.generateToken(claims);

        return new AgentTokenResponse(accessToken, "Bearer", accessTokenExpirationSeconds);
    }

    private OAuthClient validateClient(String clientId, String clientSecret) {
        return clientRepository.findByClientId(clientId)
                .map(client -> {
                    if (client.getClientSecret() == null || !client.getClientSecret().equals(clientSecret)) {
                        throw new IllegalArgumentException("Invalid client secret");
                    }
                    return client;
                })
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
    }
}