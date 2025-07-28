package com.openframe.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "api_keys")
public class ApiKey {
    @Id
    private String keyId;

    private String hashedKey;
    private String name;
    private String description;

    @Indexed
    private String userId;

    // Permissions & Scopes TODO
    private List<String> scopes;
    private List<String> roles;

    // Metadata
    private boolean enabled = true;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant expiresAt;

    /**
     * Check if the API key is expired
     */
    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    /**
     * Check if the API key is active (enabled and not expired)
     */
    public boolean isActive() {
        return enabled && !isExpired();
    }
}