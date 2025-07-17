package com.openframe.stream.model.fleet;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class HostActivity {
    @JsonProperty("host_id")
    private Long hostId;
    
    @JsonProperty("activity_id")
    private Long activityId; // Changed from String to Long for join with Activity.id
} 