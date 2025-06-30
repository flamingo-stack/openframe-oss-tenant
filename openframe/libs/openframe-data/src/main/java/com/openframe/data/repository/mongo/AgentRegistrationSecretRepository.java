package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import com.openframe.data.model.mongo.AgentRegistrationSecret;

@Repository
public interface AgentRegistrationSecretRepository extends MongoRepository<AgentRegistrationSecret, String> {
    
    Optional<AgentRegistrationSecret> findByActiveTrue();
    
    @Query(value = "{}", exists = true)
    boolean existsAny();

}