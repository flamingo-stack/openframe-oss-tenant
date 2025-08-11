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
}