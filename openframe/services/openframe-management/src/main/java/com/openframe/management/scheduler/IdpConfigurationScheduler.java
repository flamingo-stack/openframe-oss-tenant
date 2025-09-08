package com.openframe.management.scheduler;

import com.openframe.data.document.oauth.MongoRegisteredClient;
import com.openframe.data.repository.oauth.RegisteredClientMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "openframe.management.idp.init.enabled", havingValue = "true", matchIfMissing = true)
public class IdpConfigurationScheduler {

    private final RegisteredClientMongoRepository registeredClientMongoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${openframe.gateway.oauth.client-id}")
    private String gatewayClientId;

    @Value("${openframe.gateway.oauth.client-secret}")
    private String gatewayClientSecret;

    @Value("${openframe.gateway.oauth.redirect-uri}")
    private String gatewayRedirectUri;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private long accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private long refreshTokenExpirationSeconds;

    @Scheduled(fixedDelay = Long.MAX_VALUE, initialDelay = 5000)
    @SchedulerLock(name = "IdpConfigurationScheduler_initializeDefaultIdp", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void initializeDefaultIdp() {
        try {
            if (registeredClientMongoRepository.findByClientId(gatewayClientId).isPresent()) {
                log.info("Registered OAuth client already exists: {}", gatewayClientId);
                return;
            }

            String encodedSecret = passwordEncoder.encode(gatewayClientSecret);

            MongoRegisteredClient client = MongoRegisteredClient.builder()
                .clientId(gatewayClientId)
                .clientSecret(encodedSecret)
                .authenticationMethods(Set.of("none", "client_secret_basic"))
                .grantTypes(Set.of("authorization_code", "refresh_token"))
                .redirectUris(Set.of(gatewayRedirectUri))
                .scopes(Set.of("openid", "profile", "email", "offline_access"))
                .requireProofKey(true)
                .requireAuthorizationConsent(false)
                .accessTokenTtlSeconds(accessTokenExpirationSeconds)
                .refreshTokenTtlSeconds(refreshTokenExpirationSeconds)
                .reuseRefreshTokens(false)
                .build();

            registeredClientMongoRepository.save(client);
            log.info("Created default RegisteredClient: {} (redirect: {})", gatewayClientId, gatewayRedirectUri);
        } catch (Exception e) {
            log.error("Failed to initialize default IdP client: {}", gatewayClientId, e);
            throw e;
        }
    }
}


