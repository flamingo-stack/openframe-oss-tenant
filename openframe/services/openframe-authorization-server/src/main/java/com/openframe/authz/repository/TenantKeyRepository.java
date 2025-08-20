package com.openframe.authz.repository;

import com.openframe.authz.keys.TenantKeyDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantKeyRepository extends MongoRepository<TenantKeyDocument, String> {
    Optional<TenantKeyDocument> findFirstByTenantIdAndActiveTrue(String tenantId);
    long countByTenantIdAndActiveTrue(String tenantId);
}
