package com.openframe.data.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.IntegratedTool;

@Repository
public interface IntegratedToolRepository extends MongoRepository<IntegratedTool, String> {
    Optional<IntegratedTool> findByToolType(String toolType);
    Optional<IntegratedTool> findByToolTypeAndEnabled(String toolType, boolean enabled);
} 