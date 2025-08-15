package com.openframe.authz.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * User model for multi-tenant Authorization Server with domain-based tenancy
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
@CompoundIndex(def = "{'tenantId': 1, 'email': 1}", unique = true)
public class User {

    @Id
    private String id;
    
    @Indexed
    private String tenantId;
    
    @Indexed
    private String tenantDomain;
    
    @Indexed
    private String email;
    
    private String firstName;
    private String lastName;
    private String passwordHash;
    
    @Builder.Default
    private List<String> roles = new ArrayList<>();
    
    @Indexed
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, LOCKED
    
    @Builder.Default
    private boolean emailVerified = false;

    private String loginProvider; // LOCAL, GOOGLE, etc.
    private String externalUserId;
    
    private Instant lastLogin;

    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;

    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    public String getFullName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        } else {
            return email;
        }
    }
}