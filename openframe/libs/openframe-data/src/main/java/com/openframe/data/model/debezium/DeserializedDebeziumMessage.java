package com.openframe.data.model.debezium;

import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.UnifiedEventType;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Map;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Deserialized DebeziumMessage with additional enrichment fields
 * Uses JsonNode for before/after fields to maintain compatibility with existing code
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DeserializedDebeziumMessage extends DebeziumMessage<JsonNode> {

    private UnifiedEventType unifiedEventType;
    private String ingestDay;
    private String toolEventId;
    private String agentId;
    private String sourceEventType;
    private String message;
    private IntegratedToolType integratedToolType;
    private Map<String, String> details;

}
