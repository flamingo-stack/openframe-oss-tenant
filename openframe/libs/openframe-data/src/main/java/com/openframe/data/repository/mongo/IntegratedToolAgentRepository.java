package com.openframe.data.repository.mongo;

import com.openframe.core.model.IntegratedToolAgent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegratedToolAgentRepository extends MongoRepository<IntegratedToolAgent, String> {
} 