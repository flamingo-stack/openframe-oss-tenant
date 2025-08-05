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
    
    Optional<User> findByEmailAndTenantId(String email, String tenantId);
    
    Optional<User> findByExternalUserIdAndLoginProvider(String externalUserId, String loginProvider);
    
    List<User> findByTenantId(String tenantId);
    
    @Query("{ 'tenantId': ?0, 'status': 'ACTIVE' }")
    List<User> findActiveUsersByTenantId(String tenantId);
    
    boolean existsByEmail(String email);
    
    boolean existsByEmailAndTenantId(String email, String tenantId);
    
    long countByTenantId(String tenantId);
}