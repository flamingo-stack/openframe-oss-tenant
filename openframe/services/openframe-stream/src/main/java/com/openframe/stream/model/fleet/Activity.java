package com.openframe.stream.model.fleet;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class Activity {
    @JsonProperty("id")
    private Integer id;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    @JsonProperty("user_id")
    private Long userId;
    
    @JsonProperty("user_name")
    private String userName;
    
    @JsonProperty("activity_type")
    private String activityType;
    
    @JsonProperty("details")
    private String details; // JSON string
    
    @JsonProperty("streamed")
    private Integer streamed;
    
    @JsonProperty("user_email")
    private String userEmail;
    
    // Enrichment fields (not from Debezium)
    private String agentId; // From Redis cache or Fleet DB lookup by hostId
    private Integer hostId; // From HostActivity join
} 