package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public abstract class DebeziumIntegratedToolMessage extends DebeziumMessage {

    @JsonProperty("agent_id")
    private String agentId;

}
