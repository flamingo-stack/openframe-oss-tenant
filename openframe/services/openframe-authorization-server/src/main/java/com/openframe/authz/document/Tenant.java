package com.openframe.authz.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tenant document for multi-tenant architecture
 * Each tenant represents an organization/company using OpenFrame
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tenants")
public class Tenant {

    @Id
    private String id;
    
    /**
     * Unique tenant name (organization name)
     * Used for display and identification
     */
    @Indexed(unique = true)
    private String name;
    
    /**
     * Tenant domain (e.g. company.openframe.io)
     * Used for subdomain-based routing
     */
    @Indexed(unique = true)
    private String domain;
    
    /**
     * OpenFrame URL for this tenant
     * Generated as https://{tenantName}.openframe.io
     */
    private String openFrameUrl;
    
    /**
     * Owner user ID (first registered user becomes owner)
     */
    private String ownerId;
    
    /**
     * Tenant status
     */
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, SUSPENDED
    
    /**
     * Whether registration is open for this tenant
     * For single-user tenants, this should be false after first user
     */
    @Builder.Default
    private boolean registrationOpen = true;
    
    /**
     * Tenant plan (for future use)
     */
    @Builder.Default
    private String plan = "FREE"; // FREE, BASIC, PREMIUM, ENTERPRISE
    
    // Audit fields
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    /**
     * Generate a new tenant ID using UUID
     */
    public static String generateTenantId() {
        return UUID.randomUUID().toString();
    }
    
    /**
     * Generate OpenFrame URL from tenant name
     */
    public static String generateOpenFrameUrl(String tenantName) {
        return String.format("https://%s.openframe.io", tenantName.toLowerCase());
    }
    
    /**
     * Check if tenant is active
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }
    
    /**
     * Check if registration is allowed
     */
    public boolean canRegister() {
        return isActive() && registrationOpen;
    }
    
    /**
     * Close registration (typically after first user registers for single-tenant)
     */
    public void closeRegistration() {
        this.registrationOpen = false;
    }
}