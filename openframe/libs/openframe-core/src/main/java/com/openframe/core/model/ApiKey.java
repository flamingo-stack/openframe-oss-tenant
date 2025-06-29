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
    private String keyId;              // "ak_1a2b3c4d5e6f7890" - unique identifier

    private String hashedKey;          // BCrypt hash of secret part
    private String name;               // "Mobile App Production"
    private String description;        // "API key for mobile application"

    @Indexed
    private String userId;             // Owner of the key

    // Permissions & Scopes
    private List<String> scopes;       // ["devices:read", "alerts:write", "scripts:execute"]
    private List<String> roles;        // ["API_USER", "DEVICE_MANAGER"]

    // Metadata
    private boolean enabled = true;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastUsed;
    private Instant expiresAt;         // Optional expiration

    // Usage tracking
    private long totalRequests = 0;
    private long successfulRequests = 0;
    private long failedRequests = 0;

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