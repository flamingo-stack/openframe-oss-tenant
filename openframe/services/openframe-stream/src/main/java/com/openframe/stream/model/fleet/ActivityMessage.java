package com.openframe.stream.model.fleet;

import com.openframe.kafka.model.debezium.DebeziumMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Typed DebeziumMessage for activities topic
 * Contains Activity objects in before/after fields instead of JsonNode
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ActivityMessage extends DebeziumMessage<Activity> {
    // Inherits all functionality from DebeziumMessage<Activity>
    // getAfter() now returns Activity instead of JsonNode
    // getBefore() now returns Activity instead of JsonNode
} 