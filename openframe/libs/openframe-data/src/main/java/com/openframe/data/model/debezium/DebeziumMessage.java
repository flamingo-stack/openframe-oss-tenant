package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.mapper.EventTypeMapper;
import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.MessageType;
import com.openframe.data.model.enums.UnifiedEventType;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import lombok.Data;

import java.util.Map;

@Data
public abstract class DebeziumMessage implements DeserializedKafkaMessage {


    @JsonProperty("before")
    private JsonNode before;

    @JsonProperty("after")
    private JsonNode after;

    @JsonProperty("source")
    private Source source;

    @JsonProperty("op")
    private String operation;

    @JsonProperty("ts_ms")
    private Long timestamp;

    private UnifiedEventType unifiedEventType;
    private String eventToolId;
    private String userId;
    private String agentId;
    private String sourceEventType;
    private String severity;
    private Map<String, String> details;

    /**
     * Get the table/collection name - to be implemented by subclasses
     */
    public abstract String getTableName();
    public abstract IntegratedToolType getToolType();

    public UnifiedEventType getEventType() {
        if (unifiedEventType == null) {
            unifiedEventType = EventTypeMapper.mapToUnifiedType(getToolType(), getSourceEventType());
        }
        return unifiedEventType;
    }

    @Data
    public static class Source {
        @JsonProperty("version")
        private String version;
        
        @JsonProperty("connector")
        private String connector;
        
        @JsonProperty("name")
        private String name;
        
        @JsonProperty("ts_ms")
        private Long timestamp;
        
        @JsonProperty("snapshot")
        private String snapshot;
        
        @JsonProperty("db")
        private String database;
        
        @JsonProperty("sequence")
        private String sequence;
    }
} 