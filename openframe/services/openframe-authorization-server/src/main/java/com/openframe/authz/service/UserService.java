package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.authz.document.UserStatus;
import com.openframe.authz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final PasswordEncoder passwordEncoder;

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public boolean existsByEmailAndTenant(String email, String tenantId) {
        return userRepository.existsByEmailAndTenantId(email, tenantId);
    }

    /**
     * Register a new user with tenant domain
     */
    public User registerUser(String tenantId, String tenantDomain, String email, String firstName, String lastName, String password) {
        if (existsByEmailAndTenant(email, tenantId)) {
            throw new IllegalArgumentException("User with this email already exists in this tenant");
        }


        User user = User.builder()
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

        user.getRoles().add("USER");

        return userRepository.save(user);
    }
}