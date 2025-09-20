package com.openframe.stream.deserializer;

import com.openframe.kafka.model.debezium.CommonDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.MessageType;

public interface KafkaMessageDeserializer {

    MessageType getType();

    DeserializedDebeziumMessage deserialize(CommonDebeziumMessage message, MessageType type);

}
