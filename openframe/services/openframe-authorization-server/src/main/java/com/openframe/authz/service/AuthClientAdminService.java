package com.openframe.authz.service;

import com.openframe.authz.dto.CreateRegisteredClientRequest;
import com.openframe.data.document.oauth.MongoRegisteredClient;
import com.openframe.data.repository.oauth.RegisteredClientMongoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthClientAdminService {

    private final RegisteredClientRepository registeredClientRepository;
    private final RegisteredClientMongoRepository mongoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${security.oauth2.token.access.expiration-seconds:3600}")
    private long defaultAccessTokenTtlSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds:2592000}")
    private long defaultRefreshTokenTtlSeconds;

    public Map<String, Object> createClient(CreateRegisteredClientRequest req) {
        Set<String> redirectUris = emptyIfNull(req.getRedirectUris());
        Set<String> scopes = emptyIfNull(req.getScopes());

        Set<ClientAuthenticationMethod> authMethods = resolveAuthMethods(req.getAuthenticationMethods());
        Set<AuthorizationGrantType> grants = resolveGrantTypes(req.getGrantTypes());

        ClientSettings clientSettings = buildClientSettings(req);
        TokenSettings tokenSettings = buildTokenSettings(req);

        String clientId = resolveClientId(req.getClientId());
        String clientSecret = resolveClientSecret(req.getClientSecret());

        if (registeredClientRepository.findByClientId(clientId) != null) {
            throw new IllegalStateException("clientId already exists");
        }

        String encodedSecret = passwordEncoder.encode(clientSecret);
        RegisteredClient.Builder builder = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(clientId)
                .clientSecret(encodedSecret)
                .clientSettings(clientSettings)
                .tokenSettings(tokenSettings);

        authMethods.forEach(builder::clientAuthenticationMethod);
        grants.forEach(builder::authorizationGrantType);
        redirectUris.forEach(builder::redirectUri);
        scopes.forEach(builder::scope);

        RegisteredClient rc = builder.build();
        registeredClientRepository.save(rc);

        Map<String, Object> response = new HashMap<>();
        response.put("id", rc.getId());
        response.put("clientId", rc.getClientId());
        response.put("clientSecret", clientSecret);
        return response;
    }

    public void updateClient(String clientId, CreateRegisteredClientRequest req) {
        RegisteredClient existing = registeredClientRepository.findByClientId(clientId);
        if (existing == null) {
            throw new NoSuchElementException("client not found");
        }

        ClientSettings clientSettings = ClientSettings.builder()
                .requireProofKey(req.getRequireProofKey() != null ? req.getRequireProofKey() : existing.getClientSettings().isRequireProofKey())
                .requireAuthorizationConsent(req.getRequireAuthorizationConsent() != null ? req.getRequireAuthorizationConsent() : existing.getClientSettings().isRequireAuthorizationConsent())
                .build();

        long accessTtl = req.getAccessTokenTtlSeconds() != null ? req.getAccessTokenTtlSeconds() : existing.getTokenSettings().getAccessTokenTimeToLive().getSeconds();
        long refreshTtl = req.getRefreshTokenTtlSeconds() != null ? req.getRefreshTokenTtlSeconds() : existing.getTokenSettings().getRefreshTokenTimeToLive().getSeconds();

        TokenSettings tokenSettings = TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofSeconds(accessTtl))
                .refreshTokenTimeToLive(Duration.ofSeconds(refreshTtl))
                .reuseRefreshTokens(req.getReuseRefreshTokens() != null ? req.getReuseRefreshTokens() : existing.getTokenSettings().isReuseRefreshTokens())
                .build();

        RegisteredClient.Builder builder = RegisteredClient.withId(existing.getId())
                .clientId(req.getClientId() != null && !req.getClientId().isBlank() ? req.getClientId() : existing.getClientId())
                .clientSecret(req.getClientSecret() != null && !req.getClientSecret().isBlank() ? passwordEncoder.encode(req.getClientSecret()) : existing.getClientSecret())
                .clientSettings(clientSettings)
                .tokenSettings(tokenSettings);

        Set<ClientAuthenticationMethod> authMethods = (req.getAuthenticationMethods() != null && !req.getAuthenticationMethods().isEmpty())
                ? req.getAuthenticationMethods().stream().map(ClientAuthenticationMethod::new).collect(java.util.stream.Collectors.toSet())
                : existing.getClientAuthenticationMethods();
        authMethods.forEach(builder::clientAuthenticationMethod);

        Set<AuthorizationGrantType> grants = (req.getGrantTypes() != null && !req.getGrantTypes().isEmpty())
                ? req.getGrantTypes().stream().map(AuthorizationGrantType::new).collect(java.util.stream.Collectors.toSet())
                : existing.getAuthorizationGrantTypes();
        grants.forEach(builder::authorizationGrantType);

        (req.getRedirectUris() != null && !req.getRedirectUris().isEmpty() ? req.getRedirectUris() : existing.getRedirectUris()).forEach(builder::redirectUri);
        (req.getScopes() != null && !req.getScopes().isEmpty() ? req.getScopes() : existing.getScopes()).forEach(builder::scope);

        RegisteredClient updated = builder.build();
        registeredClientRepository.save(updated);
    }

    public void deleteByClientId(String clientId) {
        var doc = mongoRepository.findByClientId(clientId);
        if (doc.isEmpty()) {
            throw new NoSuchElementException("client not found");
        }
        mongoRepository.deleteById(doc.get().getId());
    }

    public Map<String, Object> getClientByClientId(String clientId) {
        return mongoRepository.findByClientId(clientId)
                .map(AuthClientAdminService::toSummary)
                .orElseThrow(() -> new NoSuchElementException("client not found"));
    }

    public Map<String, Object> listClients(int page, int size) {
        Page<MongoRegisteredClient> result = mongoRepository.findAll(PageRequest.of(page, size));
        List<Map<String, Object>> items = result.getContent().stream()
                .map(AuthClientAdminService::toSummary)
                .toList();
        Map<String, Object> response = new HashMap<>();
        response.put("content", items);
        response.put("page", result.getNumber());
        response.put("size", result.getSize());
        response.put("totalElements", result.getTotalElements());
        response.put("totalPages", result.getTotalPages());
        return response;
    }

    private static Set<String> emptyIfNull(Set<String> value) {
        return value != null ? value : Set.of();
    }

    private static Set<ClientAuthenticationMethod> resolveAuthMethods(Set<String> methods) {
        if (methods == null || methods.isEmpty()) {
            return new HashSet<>(Set.of(ClientAuthenticationMethod.CLIENT_SECRET_BASIC));
        }
        Set<ClientAuthenticationMethod> out = new HashSet<>();
        methods.forEach(v -> out.add(new ClientAuthenticationMethod(v)));
        return out;
    }

    private static Set<AuthorizationGrantType> resolveGrantTypes(Set<String> grants) {
        if (grants == null || grants.isEmpty()) {
            return new HashSet<>(Set.of(AuthorizationGrantType.AUTHORIZATION_CODE, AuthorizationGrantType.REFRESH_TOKEN));
        }
        Set<AuthorizationGrantType> out = new HashSet<>();
        grants.forEach(v -> out.add(new AuthorizationGrantType(v)));
        return out;
    }

    private static ClientSettings buildClientSettings(CreateRegisteredClientRequest req) {
        return ClientSettings.builder()
                .requireProofKey(Boolean.TRUE.equals(req.getRequireProofKey()))
                .requireAuthorizationConsent(Boolean.TRUE.equals(req.getRequireAuthorizationConsent()))
                .build();
    }

    private TokenSettings buildTokenSettings(CreateRegisteredClientRequest req) {
        long accessTtl = req.getAccessTokenTtlSeconds() != null ? req.getAccessTokenTtlSeconds() : defaultAccessTokenTtlSeconds;
        long refreshTtl = req.getRefreshTokenTtlSeconds() != null ? req.getRefreshTokenTtlSeconds() : defaultRefreshTokenTtlSeconds;
        return TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofSeconds(accessTtl))
                .refreshTokenTimeToLive(Duration.ofSeconds(refreshTtl))
                .reuseRefreshTokens(Boolean.TRUE.equals(req.getReuseRefreshTokens()))
                .build();
    }

    private static String resolveClientId(String clientId) {
        return (clientId == null || clientId.isBlank()) ? "client-" + UUID.randomUUID() : clientId;
    }

    private static String resolveClientSecret(String clientSecret) {
        return (clientSecret == null || clientSecret.isBlank()) ? generateSecret() : clientSecret;
    }

    private static String generateSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static Map<String, Object> toSummary(MongoRegisteredClient doc) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", doc.getId());
        map.put("clientId", doc.getClientId());
        map.put("authenticationMethods", doc.getAuthenticationMethods());
        map.put("grantTypes", doc.getGrantTypes());
        map.put("redirectUris", doc.getRedirectUris());
        map.put("scopes", doc.getScopes());
        map.put("requireProofKey", doc.isRequireProofKey());
        map.put("requireAuthorizationConsent", doc.isRequireAuthorizationConsent());
        map.put("accessTokenTtlSeconds", doc.getAccessTokenTtlSeconds());
        map.put("refreshTokenTtlSeconds", doc.getRefreshTokenTtlSeconds());
        map.put("reuseRefreshTokens", doc.isReuseRefreshTokens());
        return map;
    }
}


