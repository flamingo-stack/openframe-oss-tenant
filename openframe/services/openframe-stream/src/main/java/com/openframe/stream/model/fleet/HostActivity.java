package com.openframe.stream.model.fleet;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class HostActivity {
    @JsonProperty("host_id")
    private Integer hostId;
    
    @JsonProperty("activity_id")
    private Integer activityId;
} 