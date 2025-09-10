package com.openframe.data.repository.mongo;

import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.document.toolagent.ToolAgentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IntegratedToolAgentRepository extends MongoRepository<IntegratedToolAgent, String> {

    List<IntegratedToolAgent> findByStatus(ToolAgentStatus status);

} 