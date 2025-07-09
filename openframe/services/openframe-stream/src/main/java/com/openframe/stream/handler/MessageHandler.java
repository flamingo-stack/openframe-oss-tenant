package com.openframe.stream.handler;

import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.data.model.enums.Destination;
import com.openframe.data.model.enums.MessageType;

public interface MessageHandler<U extends DeserializedKafkaMessage, V extends ExtraParams> {

    MessageType getType();

    Destination getDestination();

    void handle(U message, V extraParams);

}
