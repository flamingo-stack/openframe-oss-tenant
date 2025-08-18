package com.openframe.authz.repository;

import com.openframe.authz.document.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByEmail(String email);
    
    /**
     * Find all users with the same email across all tenants
     * Used for tenant discovery and SSO
     */
    List<User> findAllByEmail(String email);

    /**
     * Find all ACTIVE users by email across tenants
     * Prefer this over findAllByEmail + in-memory filtering
     */
    List<User> findAllByEmailAndStatus(String email, com.openframe.authz.document.UserStatus status);

    /**
     * Find single ACTIVE user by email
     */
    Optional<User> findByEmailAndStatus(String email, com.openframe.authz.document.UserStatus status);
    
    Optional<User> findByEmailAndTenantId(String email, String tenantId);
    
    Optional<User> findByExternalUserIdAndLoginProvider(String externalUserId, String loginProvider);
    
    List<User> findByTenantId(String tenantId);
    
    @Query("{ 'tenantId': ?0, 'status': 'ACTIVE' }")
    List<User> findActiveUsersByTenantId(String tenantId);
    
    boolean existsByEmail(String email);
    
    boolean existsByEmailAndTenantId(String email, String tenantId);
    
    long countByTenantId(String tenantId);
    
    /**
     * Count how many tenants a user has accounts in
     */
    long countByEmail(String email);
}