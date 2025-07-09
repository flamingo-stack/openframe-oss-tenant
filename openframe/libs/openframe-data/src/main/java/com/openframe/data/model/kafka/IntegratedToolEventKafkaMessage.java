package com.openframe.data.model.kafka;

import lombok.Data;

@Data
public class IntegratedToolEventKafkaMessage {

    private Long timestamp;
    private String toolName;
    private String agentId;
    private String machineId;
}
