package com.openframe.stream.deserializer;

import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.MessageType;

public interface KafkaMessageDeserializer {

    MessageType getType();

    DeserializedDebeziumMessage deserialize(DeserializedDebeziumMessage message, MessageType type);

}
