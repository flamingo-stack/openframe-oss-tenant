package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import lombok.Data;

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
    
    /**
     * Get the table/collection name - to be implemented by subclasses
     */
    public abstract String getTableName();
    
    /**
     * Get the database type for this message
     */
    public DatabaseType getDatabaseType() {
        if (source == null || source.getConnector() == null) {
            return DatabaseType.UNKNOWN;
        }
        
        String connector = source.getConnector().toLowerCase();
        if (connector.contains("mongodb")) {
            return DatabaseType.MONGODB;
        } else if (connector.contains("postgresql") || connector.contains("postgres")) {
            return DatabaseType.POSTGRESQL;
        } else if (connector.contains("mysql")) {
            return DatabaseType.MYSQL;
        }
        return DatabaseType.UNKNOWN;
    }
    
    public enum DatabaseType {
        MONGODB,
        POSTGRESQL,
        MYSQL,
        UNKNOWN
    }
    
    /**
     * Get the database name
     */
    public String getDatabaseName() {
        return source != null ? source.getDatabase() : null;
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