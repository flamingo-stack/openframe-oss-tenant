package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.IntegratedTool;

@Repository
public interface IntegratedToolRepository extends MongoRepository<IntegratedTool, String> {
    Optional<IntegratedTool> findByType(String type);
    Optional<IntegratedTool> findByTypeAndEnabled(String toolType, boolean enabled);
} 