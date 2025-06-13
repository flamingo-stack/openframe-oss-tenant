package com.openframe.data.model.kafka;

import lombok.Data;

import java.time.Instant;

@Data
public class KafkaITPinotMessage {

    private String eventType;
    private Instant timestamp;
    private String toolName;
}
