package com.openframe.stream.handler;

import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.MessageType;

import java.util.Map;

public interface MessageHandler<U extends DeserializedKafkaMessage, V extends ExtraParams> {

    MessageType getType();

    void handle(U message, V extraParams);

}
