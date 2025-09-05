package com.openframe.authz.repository;

import com.openframe.data.document.oauth.MongoRegisteredClient;
import com.openframe.data.repository.oauth.RegisteredClientMongoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class MongoRegisteredClientRepository implements RegisteredClientRepository {

    private final RegisteredClientMongoRepository repo;

    @Override
    public void save(RegisteredClient registeredClient) {
        MongoRegisteredClient doc = MongoRegisteredClient.builder()
                .id(registeredClient.getId() != null ? registeredClient.getId() : UUID.randomUUID().toString())
                .clientId(registeredClient.getClientId())
                .clientSecret(registeredClient.getClientSecret())
                .authenticationMethods(registeredClient.getClientAuthenticationMethods().stream().map(ClientAuthenticationMethod::getValue).collect(Collectors.toSet()))
                .grantTypes(registeredClient.getAuthorizationGrantTypes().stream().map(AuthorizationGrantType::getValue).collect(Collectors.toSet()))
                .redirectUris(registeredClient.getRedirectUris())
                .scopes(registeredClient.getScopes())
                .requireProofKey(registeredClient.getClientSettings().isRequireProofKey())
                .requireAuthorizationConsent(registeredClient.getClientSettings().isRequireAuthorizationConsent())
                .accessTokenTtlSeconds(registeredClient.getTokenSettings().getAccessTokenTimeToLive().getSeconds())
                .refreshTokenTtlSeconds(registeredClient.getTokenSettings().getRefreshTokenTimeToLive().getSeconds())
                .reuseRefreshTokens(registeredClient.getTokenSettings().isReuseRefreshTokens())
                .build();
        repo.save(doc);
    }

    @Override
    public RegisteredClient findById(String id) {
        return repo.findById(id).map(this::toRegistered).orElse(null);
    }

    @Override
    public RegisteredClient findByClientId(String clientId) {
        return repo.findByClientId(clientId).map(this::toRegistered).orElse(null);
    }

    private RegisteredClient toRegistered(MongoRegisteredClient doc) {
        ClientSettings clientSettings = ClientSettings.builder()
                .requireProofKey(doc.isRequireProofKey())
                .requireAuthorizationConsent(doc.isRequireAuthorizationConsent())
                .build();

        TokenSettings tokenSettings = TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofSeconds(doc.getAccessTokenTtlSeconds()))
                .refreshTokenTimeToLive(Duration.ofSeconds(doc.getRefreshTokenTtlSeconds()))
                .reuseRefreshTokens(doc.isReuseRefreshTokens())
                .build();

        RegisteredClient.Builder b = RegisteredClient.withId(doc.getId())
                .clientId(doc.getClientId())
                .clientSecret(doc.getClientSecret())
                .clientSettings(clientSettings)
                .tokenSettings(tokenSettings);

        Set<ClientAuthenticationMethod> authMethods = doc.getAuthenticationMethods().stream()
                .map(ClientAuthenticationMethod::new).collect(Collectors.toSet());
        authMethods.forEach(b::clientAuthenticationMethod);

        Set<AuthorizationGrantType> grants = doc.getGrantTypes().stream()
                .map(AuthorizationGrantType::new).collect(Collectors.toSet());
        grants.forEach(b::authorizationGrantType);

        doc.getRedirectUris().forEach(b::redirectUri);
        doc.getScopes().forEach(b::scope);

        return b.build();
    }
}