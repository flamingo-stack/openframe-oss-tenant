package com.openframe.authz.repository;

import com.openframe.authz.document.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    /**
     * Find all ACTIVE users by email across tenants
     * Prefer this over findAllByEmail + in-memory filtering
     */
    List<User> findAllByEmailAndStatus(String email, com.openframe.authz.document.UserStatus status);

    /**
     * Find single ACTIVE user by email
     */
    Optional<User> findByEmailAndStatus(String email, com.openframe.authz.document.UserStatus status);

    /**
     * Find single ACTIVE user by email within a specific tenant
     */
    Optional<User> findByEmailAndTenantIdAndStatus(String email, String tenantId, com.openframe.authz.document.UserStatus status);
    
    boolean existsByEmailAndTenantId(String email, String tenantId);
}