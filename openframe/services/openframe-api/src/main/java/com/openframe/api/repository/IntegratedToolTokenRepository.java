package com.openframe.api.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.api.model.IntegratedToolToken;
import com.openframe.api.model.IntegratedToolType;

public interface IntegratedToolTokenRepository extends MongoRepository<IntegratedToolToken, String> {
    Optional<IntegratedToolToken> findFirstByToolTypeAndActiveOrderByCreatedAtDesc(IntegratedToolType toolType, boolean active);
    void deactivateAllByToolType(IntegratedToolType toolType);
} 