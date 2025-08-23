package com.openframe.data.repository.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.OAuthClient;

@Repository
public interface OAuthClientRepository extends MongoRepository<OAuthClient, String> {
    // Legacy methods (keep for backward compatibility during migration)
    Optional<OAuthClient> findByClientId(String clientId);
    boolean existsByMachineId(String machineId);
    
    // New tenant-aware queries
    Optional<OAuthClient> findByClientIdAndTenantId(String clientId, String tenantId);
    boolean existsByClientIdAndTenantId(String clientId, String tenantId);
    boolean existsByMachineIdAndTenantId(String machineId, String tenantId);
    
    // Tenant-scoped queries
    List<OAuthClient> findByTenantId(String tenantId);
    List<OAuthClient> findByTenantIdAndClientType(String tenantId, String clientType);
    List<OAuthClient> findByTenantIdAndEnabled(String tenantId, boolean enabled);
    
    // Active clients query
    @Query("{'tenantId': ?0, 'enabled': true}")
    List<OAuthClient> findActiveByTenantId(String tenantId);
    
    @Query("{'tenantId': ?0, 'clientType': ?1, 'enabled': true}")
    List<OAuthClient> findActiveByTenantIdAndClientType(String tenantId, String clientType);
    
    // Client type specific queries
    List<OAuthClient> findByClientType(String clientType);
    
    // Machine-specific queries for agents
    Optional<OAuthClient> findByMachineIdAndTenantId(String machineId, String tenantId);
    List<OAuthClient> findByTenantIdAndMachineIdIsNotNull(String tenantId);
} 