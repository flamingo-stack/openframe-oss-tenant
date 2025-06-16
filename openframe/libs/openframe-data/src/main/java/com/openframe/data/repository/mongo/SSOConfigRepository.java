package com.openframe.data.repository.mongo;

import com.openframe.core.model.SSOConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SSOConfigRepository extends MongoRepository<SSOConfig, String> {

    Optional<SSOConfig> findByProvider(String provider);
}