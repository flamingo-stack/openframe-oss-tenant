package com.openframe.data.model.debezium;

import com.openframe.data.model.enums.UnifiedEventType;
import lombok.Data;

@Data
public class IntegratedToolEnrichedData implements ExtraParams {

    private String machineId;
    private String userId;
    
    // Unified event type information
    private UnifiedEventType unifiedEventType;
    private String sourceEventType;
    private String toolName;

}
