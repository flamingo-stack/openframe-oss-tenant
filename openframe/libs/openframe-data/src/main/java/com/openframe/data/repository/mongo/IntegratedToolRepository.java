package com.openframe.data.repository.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.IntegratedTool;

@Repository
public interface IntegratedToolRepository extends MongoRepository<IntegratedTool, String> {
    Optional<IntegratedTool> findByType(String type);
    Optional<List<IntegratedTool>> findByEnabledTrue();
} 