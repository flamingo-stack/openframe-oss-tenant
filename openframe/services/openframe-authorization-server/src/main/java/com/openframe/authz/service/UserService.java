package com.openframe.authz.service;

import com.openframe.data.document.auth.AuthUser;
import com.openframe.data.document.user.UserStatus;
import com.openframe.data.repository.auth.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Optional<AuthUser> findActiveByEmail(String email) {
        return userRepository.findByEmailAndStatus(email, UserStatus.ACTIVE);
    }

    public Optional<AuthUser> findActiveByEmailAndTenant(String email, String tenantId) {
        return userRepository.findByEmailAndTenantIdAndStatus(email, tenantId, UserStatus.ACTIVE);
    }

    public Optional<AuthUser> findActiveByEmail(String email, String tenantId) {
        return userRepository.findByEmailAndStatus(email, UserStatus.ACTIVE);
    }

    public boolean existsByEmailAndTenant(String email, String tenantId) {
        return userRepository.existsByEmailAndTenantId(email, tenantId);
    }

    /**
     * Register a new user with tenant domain
     */
    public AuthUser registerUser(String tenantId, String tenantDomain, String email, String firstName, String lastName, String password, String role) {
        if (existsByEmailAndTenant(email, tenantId)) {
            throw new IllegalArgumentException("User with this email already exists in this tenant");
        }

        AuthUser user = AuthUser.builder()
                .id(randomUUID().toString())
            .tenantId(tenantId)
            .tenantDomain(tenantDomain)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .passwordHash(passwordEncoder.encode(password))
            .status(UserStatus.ACTIVE)
            .emailVerified(false)
            .loginProvider("LOCAL")
            .build();

        user.getRoles().add(role);

        return userRepository.save(user);
    }
}