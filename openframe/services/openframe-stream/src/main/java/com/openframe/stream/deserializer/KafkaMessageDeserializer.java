package com.openframe.stream.deserializer;

import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.DeserializerType;
import com.openframe.stream.enumeration.MessageType;

import java.util.Map;

public interface KafkaMessageDeserializer {

    DeserializerType getType();

    DeserializedKafkaMessage deserialize(Map<String, Object> message);

}
