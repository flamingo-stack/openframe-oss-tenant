package com.openframe.data.model.debezium;

import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.UnifiedEventType;
import lombok.Data;

import java.util.Map;

@Data
public class DeserializedDebeziumMessage extends DebeziumMessage {

    private UnifiedEventType unifiedEventType;
    private String ingestDay;
    private String toolEventId;
    private String agentId;
    private String sourceEventType;
    private String message;
    private IntegratedToolType integratedToolType;
    private Map<String, String> details;

}
