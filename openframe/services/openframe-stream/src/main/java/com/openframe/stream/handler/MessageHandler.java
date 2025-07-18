package com.openframe.stream.handler;

import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.Destination;
import com.openframe.data.model.enums.MessageType;

public interface MessageHandler<U extends DeserializedDebeziumMessage, V extends IntegratedToolEnrichedData> {

    MessageType getType();

    Destination getDestination();

    void handle(U message, V extraParams);

}
