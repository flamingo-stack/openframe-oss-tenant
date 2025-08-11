package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.authz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

import static java.util.UUID.randomUUID;

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

    @Value("${openframe.domain.validation.regex}")
    private String domainValidationRegex;

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
                .id(randomUUID().toString())
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
        return domain.matches(domainValidationRegex);
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
                .id(randomUUID().toString())
            .tenantId(tenantId)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .status("ACTIVE")
                .emailVerified(true)
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

    // Backward-compatibility helpers removed

    /**
     * Create user from SSO provider (Google, Microsoft, etc.)
     */
    public User createUserFromSSO(String email, String firstName, String lastName, 
                                  String tenantId, String ssoProvider) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setTenantId(tenantId);
        user.setStatus("ACTIVE");
        user.setEmailVerified(true); // SSO providers typically verify email
        user.setCreatedAt(LocalDateTime.now());
        user.setLastLogin(Instant.now());
        
        // Set SSO metadata
        user.setLoginProvider(ssoProvider.toUpperCase());
        user.setPasswordHash(null); // No password for SSO users
        
        // Set default role
        user.setRoles(List.of("USER"));

        return userRepository.save(user);
    }

    /**
     * Find user by email and tenant ID (for SSO login)
     */
    public Optional<User> findByEmailAndTenantId(String email, String tenantId) {
        return userRepository.findByEmail(email)
                .stream()
                .filter(user -> tenantId.equals(user.getTenantId()))
                .findFirst();
    }
}