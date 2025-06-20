package com.openframe.data.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class DebeziumMessage {
    
    @JsonProperty("before")
    private JsonNode before;
    
    @JsonProperty("after")
    private String after;
    
    @JsonProperty("source")
    private Source source;
    
    @JsonProperty("op")
    private String operation;
    
    @JsonProperty("ts_ms")
    private Long timestamp;
    
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
        
        @JsonProperty("collection")
        private String collection;
        
        @JsonProperty("ord")
        private Integer order;
    }
} 