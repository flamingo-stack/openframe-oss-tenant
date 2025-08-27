package com.openframe.authz.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Data
@Document(collection = "oauth2_authorizations")
@CompoundIndex(def = "{'registeredClientId': 1, 'principalName': 1}")
public class MongoOAuth2Authorization {
    @Id
    private String id;

    @Indexed
    private String registeredClientId;

    @Indexed
    private String principalName;

    private String authorizationGrantType;

    // Minimal snapshot for PKCE reconstruction (avoid complex objects / dotted keys)
    private String arClientId;
    private String arAuthorizationUri;
    private String arRedirectUri;
    private String arScopes; // space-delimited
    private String arState;
    private Map<String, String> arAdditional; // only simple strings (e.g., code_challenge)

    // State
    @Indexed
    private String state;

    // Authorization Code
    private String authorizationCodeValue;
    private Instant authorizationCodeIssuedAt;
    private Instant authorizationCodeExpiresAt;
    private Map<String, Object> authorizationCodeMetadata;

    // Access Token
    @Indexed
    private String accessTokenValue;
    private Instant accessTokenIssuedAt;
    private Instant accessTokenExpiresAt;
    private String accessTokenType;
    private String accessTokenScopes; // space-delimited
    private Map<String, Object> accessTokenMetadata;

    // Refresh Token
    @Indexed
    private String refreshTokenValue;
    private Instant refreshTokenIssuedAt;
    private Instant refreshTokenExpiresAt;
    private Map<String, Object> refreshTokenMetadata;

    // TTL index for automatic cleanup
    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;  // Set to latest token expiration

    public void updateExpiresAt() {
        this.expiresAt = Stream.of(
                        this.authorizationCodeExpiresAt,
                        this.accessTokenExpiresAt,
                        this.refreshTokenExpiresAt
                )
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
    }
}
