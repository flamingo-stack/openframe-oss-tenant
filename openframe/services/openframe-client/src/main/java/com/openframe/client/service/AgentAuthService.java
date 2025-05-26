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

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentAuthService {

    private final OAuthClientRepository clientRepository;
    private final JwtService jwtService;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    public AgentTokenResponse issueClientToken(String clientId, String clientSecret) {
        log.debug("Validating client - ID: {}", clientId);
        OAuthClient client = clientRepository.findByClientId(clientId)
                .map(foundClient -> {
                    if (foundClient.getClientSecret() == null || !foundClient.getClientSecret().equals(clientSecret)) {
                        log.error("Invalid client secret for client: {}", clientId);
                        throw new IllegalArgumentException("Invalid client secret");
                    }
                    log.debug("Client validation successful for: {}", clientId);
                    return foundClient;
                })
                .orElseThrow(() -> {
                    log.error("Client not found: {}", clientId);
                    return new IllegalArgumentException("Client not found");
                });

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("https://auth.openframe.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
                .subject(client.getClientId())
                .claim("grant_type", "client_credentials")
                .claim("scopes", client.getScopes())
                .build();

        return new AgentTokenResponse(
                jwtService.generateToken(claims),
                "Bearer",
                accessTokenExpirationSeconds
        );
    }
}