package com.openframe.data.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.IntegratedToolToken;
import com.openframe.data.model.IntegratedToolType;

@Repository
public interface IntegratedToolTokenRepository extends MongoRepository<IntegratedToolToken, String> {
    Optional<IntegratedToolToken> findFirstByToolTypeAndActiveOrderByCreatedAtDesc(IntegratedToolType toolType, boolean active);
    
    @Query("{ 'toolType' : ?0 }")
    @Update("{ '$set' : { 'active' : false }}")
    void deactivateAllByToolType(IntegratedToolType toolType);
} 