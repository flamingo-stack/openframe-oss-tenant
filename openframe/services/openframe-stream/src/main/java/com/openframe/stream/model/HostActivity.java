package com.openframe.stream.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class HostActivity {
    @JsonProperty("host_id")
    private Long hostId;
    
    @JsonProperty("activity_id")
    private String activityId; // Это timestamp, а не Long как я предполагал
} 