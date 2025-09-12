package com.openframe.authz.service;

import com.openframe.data.document.auth.AuthUser;
import com.openframe.data.document.user.UserRole;
import com.openframe.data.document.user.UserStatus;
import com.openframe.data.repository.auth.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Optional<AuthUser> findActiveByEmail(String email) {
        return userRepository.findByEmailAndStatus(email, UserStatus.ACTIVE);
    }

    public Optional<AuthUser> findActiveByEmailAndTenant(String email, String tenantId) {
        return userRepository.findByEmailAndTenantIdAndStatus(email, tenantId, UserStatus.ACTIVE);
    }

    public boolean existsByEmailAndTenant(String email, String tenantId) {
        return userRepository.existsByEmailAndTenantId(email, tenantId);
    }

    /**
     * Register a new user
     */
    public AuthUser registerUser(String tenantId, String email, String firstName, String lastName, String password, List<UserRole> roles) {
        if (existsByEmailAndTenant(email, tenantId)) {
            throw new IllegalArgumentException("User with this email already exists in this tenant");
        }

        AuthUser user = AuthUser.builder()
                .id(randomUUID().toString())
                .tenantId(tenantId)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .passwordHash(passwordEncoder.encode(password))
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .roles(roles)
                .loginProvider("LOCAL")
                .build();

        return userRepository.save(user);
    }

    public void deactivateUser(AuthUser user) {
            user.setStatus(UserStatus.DELETED);
            userRepository.save(user);
    }

    public void updatePassword(String userId, String rawPassword) {
        userRepository.findById(userId).ifPresentOrElse(user -> {
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }, () -> {
            throw new IllegalArgumentException("User not found: " + userId);
        });
    }
}