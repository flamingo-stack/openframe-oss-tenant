package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.authz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Simplified User Service for Authorization Server
 * Only essential operations needed for authentication and user management
 */
@Service
@Transactional
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;

    // ============ SIMPLE CRUD OPERATIONS (via Repository) ============

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public User findByEmailAndTenant(String email, String tenantId) {
        return userRepository.findByEmailAndTenantId(email, tenantId).orElse(null);
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    public List<User> findByTenant(String tenantId) {
        return userRepository.findByTenantId(tenantId);
    }

    public List<User> findActiveUsersByTenant(String tenantId) {
        return userRepository.findActiveUsersByTenantId(tenantId);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public void deleteById(String id) {
        userRepository.deleteById(id);
    }

    public boolean existsByEmailAndTenant(String email, String tenantId) {
        return userRepository.existsByEmailAndTenantId(email, tenantId);
    }

    public long countByTenant(String tenantId) {
        return userRepository.countByTenantId(tenantId);
    }

    // ============ BUSINESS LOGIC ============

    /**
     * Register a new user with tenant domain
     */
    public User registerUser(String tenantId, String tenantDomain, String email, String firstName, String lastName, String password) {
        // Check if user already exists by email in this tenant
        if (existsByEmailAndTenant(email, tenantId)) {
            throw new IllegalArgumentException("User with this email already exists in this tenant");
        }
        
        // Validate domain format
        if (tenantDomain != null && !isValidDomain(tenantDomain)) {
            throw new IllegalArgumentException("Invalid domain format");
        }
        
        // Create user using simplified builder pattern
        User user = User.builder()
            .tenantId(tenantId)
            .tenantDomain(tenantDomain)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .passwordHash(passwordEncoder.encode(password))
            .status("ACTIVE")
            .emailVerified(false)
            .loginProvider("LOCAL")
            .build();

        // Add default role
        user.getRoles().add("USER");

        return userRepository.save(user);
    }
    
    private boolean isValidDomain(String domain) {
        return domain.matches("^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\\.[a-zA-Z]{2,})$");
    }

    /**
     * Create user for OAuth providers (like Google SSO)
     */
    public User createOAuthUser(String tenantId, String email, String firstName, String lastName, 
                               String loginProvider, String externalUserId) {
        // Check if user already exists by email in this tenant
        if (existsByEmailAndTenant(email, tenantId)) {
            throw new IllegalArgumentException("User with this email already exists");
        }
        
        User user = User.builder()
            .tenantId(tenantId)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .status("ACTIVE")
            .emailVerified(true) // OAuth users are pre-verified
            .loginProvider(loginProvider)
            .externalUserId(externalUserId)
            .lastLogin(Instant.now())
            .build();

        // Add default role
        user.getRoles().add("USER");

        return userRepository.save(user);
    }

    /**
     * Update user's last login time
     */
    public void updateLastLogin(String userId) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().set("lastLogin", Instant.now());
        mongoTemplate.updateFirst(query, update, User.class);
    }

    /**
     * Validate user password
     */
    public boolean validatePassword(User user, String password) {
        return user.getPasswordHash() != null && passwordEncoder.matches(password, user.getPasswordHash());
    }

    /**
     * Update user password (simplified)
     */
    public void updatePassword(String userId, String newPassword) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().set("passwordHash", passwordEncoder.encode(newPassword));
        mongoTemplate.updateFirst(query, update, User.class);
    }

    /**
     * Add role to user (simplified)
     */
    public void addRole(String userId, String role) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().addToSet("roles", role);
        mongoTemplate.updateFirst(query, update, User.class);
    }

    /**
     * Remove role from user (simplified)
     */
    public void removeRole(String userId, String role) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().pull("roles", role);
        mongoTemplate.updateFirst(query, update, User.class);
    }

    /**
     * Set user status (ACTIVE, INACTIVE, LOCKED, SUSPENDED)
     */
    public void setUserStatus(String userId, String status) {
        Query query = new Query(Criteria.where("id").is(userId));
        Update update = new Update().set("status", status);
        mongoTemplate.updateFirst(query, update, User.class);
    }

    /**
     * Find user by username and tenant (for backward compatibility)
     * In our simplified model, username = email
     */
    public User findByUsernameAndTenant(String username, String tenantId) {
        return findByEmailAndTenant(username, tenantId);
    }

    /**
     * Create user (for backward compatibility with DataInitializer)
     */
    public User createUser(String tenantId, String username, String email, String password) {
        // In simplified model, username is email, no domain for backward compatibility
        return registerUser(tenantId, null, email, extractFirstName(email), extractLastName(email), password);
    }

    /**
     * Assign role (for backward compatibility with DataInitializer)
     */
    public void assignRole(String userId, String roleId, String assignedBy) {
        // For simplified model, we'll use role name instead of roleId
        // Convert roleId to role name if it's a standard role
        String roleName = convertRoleIdToName(roleId);
        addRole(userId, roleName);
    }

    /**
     * Extract first name from email (simple fallback)
     */
    private String extractFirstName(String email) {
        if (email == null) return "User";
        String localPart = email.substring(0, email.indexOf('@'));
        return localPart.substring(0, 1).toUpperCase() + localPart.substring(1);
    }

    /**
     * Extract last name from email (simple fallback)
     */
    private String extractLastName(String email) {
        return ""; // Empty for now
    }

    /**
     * Convert role ID to role name for backward compatibility
     */
    private String convertRoleIdToName(String roleId) {
        // Simple mapping for common roles
        switch (roleId) {
            case "default-user-role-id":
            case "user-role":
                return "USER";
            case "admin-role":
            case "default-admin-role-id":
                return "ADMIN";
            default:
                return "USER"; // Default fallback
        }
    }
}