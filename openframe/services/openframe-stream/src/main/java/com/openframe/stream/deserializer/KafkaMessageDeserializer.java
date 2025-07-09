package com.openframe.stream.deserializer;

import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.data.model.enums.MessageType;

import java.util.Map;

public interface KafkaMessageDeserializer {

    MessageType getType();

    DeserializedKafkaMessage deserialize(Map<String, Object> message);

}
