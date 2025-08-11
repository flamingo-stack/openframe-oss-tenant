package com.openframe.authz.repository;

import com.openframe.authz.document.SSOConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SSOConfigRepository extends MongoRepository<SSOConfig, String> {
    
    Optional<SSOConfig> findByProviderAndTenantId(String provider, String tenantId);
    
    Optional<SSOConfig> findByTenantIdAndProvider(String tenantId, String provider);
    
    Optional<SSOConfig> findByProvider(String provider);
    
    List<SSOConfig> findByEnabledTrue();
    
    List<SSOConfig> findByEnabledTrueAndTenantId(String tenantId);
    
    List<SSOConfig> findByTenantId(String tenantId);
    
    List<SSOConfig> findByTenantIdAndEnabledTrue(String tenantId);
}