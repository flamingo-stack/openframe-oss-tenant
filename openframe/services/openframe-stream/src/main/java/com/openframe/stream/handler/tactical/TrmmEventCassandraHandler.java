package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.debezium.PostgreSqlDebeziumMessage;
import com.openframe.data.model.debezium.TrmmEventMessage;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity, TrmmEventMessage> {

    protected TrmmEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper, TrmmEventMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected boolean isValidMessage(TrmmEventMessage message) {
        return message != null && 
               message.getAfter() != null;
    }

    @Override
    protected CassandraITEventEntity transform(TrmmEventMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        CassandraITEventEntity entity = new CassandraITEventEntity();
        
        try {
            CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();
            
            // Extract agent ID from the message
            String agentId = debeziumMessage.getAgentId();
            key.setToolId(agentId);
            key.setToolName(IntegratedTool.TACTICAL.getDbName());
            key.setTimestamp(Instant.now());
            key.setMachineId(enrichedData.getMachineId());
            key.setId(key.generatePK());
            entity.setKey(key);
            
            // Create payload with relevant event information
            Map<String, String> payload = new HashMap<>();
            payload.put("agentId", agentId);
            payload.put("eventType", "TACTICAL_RMM_EVENT");
            payload.put("timestamp", String.valueOf(debeziumMessage.getTimestamp()));
            
            // Add additional event data if available
            if (debeziumMessage.getUsername() != null) {
                payload.put("username", debeziumMessage.getUsername());
            }
            if (debeziumMessage.getAction() != null) {
                payload.put("action", debeziumMessage.getAction());
            }
            if (debeziumMessage.getObjectType() != null) {
                payload.put("objectType", debeziumMessage.getObjectType());
            }
            if (debeziumMessage.getMessage() != null) {
                payload.put("message", debeziumMessage.getMessage());
            }
            if (debeziumMessage.getEntryTime() != null) {
                payload.put("entryTime", debeziumMessage.getEntryTime());
            }
            if (debeziumMessage.getDebugInfo() != null) {
                payload.put("debugInfo", debeziumMessage.getDebugInfo());
            }
            if (debeziumMessage.getBeforeValue() != null) {
                payload.put("beforeValue", debeziumMessage.getBeforeValue());
            }
            if (debeziumMessage.getAfterValue() != null) {
                payload.put("afterValue", debeziumMessage.getAfterValue());
            }
            
            entity.setPayload(payload);
            entity.setEventType("TACTICAL_RMM_EVENT");
            
            log.debug("Transformed Tactical RMM event for agent: {}", agentId);
            
        } catch (Exception e) {
            log.error("Error transforming Tactical RMM event message", e);
            throw new RuntimeException("Failed to transform Tactical RMM event message", e);
        }
        
        return entity;
    }
}
