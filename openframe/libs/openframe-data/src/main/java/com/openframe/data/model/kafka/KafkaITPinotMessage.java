package com.openframe.data.model.kafka;

import lombok.Data;

import java.time.Instant;

@Data
public class KafkaITPinotMessage {

    private Long timestamp;
    private String toolName;
    private String agentId;
    private String machineId;
}
