package com.openframe.stream.handler;

import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.Destination;
import com.openframe.stream.enumeration.MessageType;

import java.util.Map;

public interface MessageHandler<U extends DeserializedKafkaMessage, V extends ExtraParams> {

    MessageType getType();

    Destination getDestination();

    void handle(U message, V extraParams);

}
