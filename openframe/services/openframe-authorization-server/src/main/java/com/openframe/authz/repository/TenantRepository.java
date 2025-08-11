package com.openframe.authz.repository;

import com.openframe.authz.document.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Tenant documents
 */
@Repository
public interface TenantRepository extends MongoRepository<Tenant, String> {
    
    /**
     * Find tenant by name (case-insensitive)
     */
    @Query("{'name': {$regex: ?0, $options: 'i'}}")
    Optional<Tenant> findByNameIgnoreCase(String name);
    
    /**
     * Find tenant by domain
     */
    Optional<Tenant> findByDomain(String domain);
    
    /**
     * Check if tenant name exists (case-insensitive)
     */
    @Query(value = "{'name': {$regex: ?0, $options: 'i'}}", exists = true)
    boolean existsByNameIgnoreCase(String name);
    
    /**
     * Check if domain exists
     */
    boolean existsByDomain(String domain);
    
    /**
     * Find all active tenants
     */
    List<Tenant> findByStatus(String status);
    
    /**
     * Find tenants with open registration
     */
    List<Tenant> findByRegistrationOpenTrue();
    
    /**
     * Find tenant by owner ID
     */
    Optional<Tenant> findByOwnerId(String ownerId);
    
    /**
     * Count total tenants
     */
    @Override
    long count();
}