package com.openframe.stream.model.fleet;

import com.openframe.kafka.model.debezium.DebeziumMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Typed DebeziumMessage for host_activities topic
 * Contains HostActivity objects in before/after fields instead of JsonNode
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class HostActivityMessage extends DebeziumMessage<HostActivity> {
    // Inherits all functionality from DebeziumMessage<HostActivity>
    // getAfter() now returns HostActivity instead of JsonNode
    // getBefore() now returns HostActivity instead of JsonNode
} 