package com.openframe.client.service;

import com.openframe.client.dto.AgentTokenResponse;
import com.openframe.client.service.auth.ClientCredentialsHandler;
import com.openframe.client.service.auth.RefreshTokenHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentAuthService {

    private final ClientCredentialsHandler clientCredentialsHandler;
    private final RefreshTokenHandler refreshTokenHandler;

    public AgentTokenResponse issueClientToken(
            String grantType,
            String refreshToken,
            String clientId,
            String clientSecret
    ) {
        log.debug("Validating client - ID: {}", clientId);

        return switch (grantType) {
            case "client_credentials" -> clientCredentialsHandler.handle(clientId, clientSecret);
            case "refresh_token" -> refreshTokenHandler.handle(refreshToken);
            default -> throw new IllegalArgumentException("Unsupported grant type: " + grantType);
        };
    }
}