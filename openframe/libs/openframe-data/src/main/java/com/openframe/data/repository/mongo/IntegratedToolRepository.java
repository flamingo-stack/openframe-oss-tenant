package com.openframe.data.repository.mongo;

import com.openframe.core.model.IntegratedTool;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IntegratedToolRepository extends MongoRepository<IntegratedTool, String> {
    Optional<IntegratedTool> findByType(String type);
} 