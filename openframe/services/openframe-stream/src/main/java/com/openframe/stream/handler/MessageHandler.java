package com.openframe.stream.handler;

import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.Destination;
import com.openframe.data.model.enums.EventHandlerType;

public interface MessageHandler<U extends DeserializedDebeziumMessage, V extends IntegratedToolEnrichedData> {

    EventHandlerType getType();

    Destination getDestination();

    void handle(U message, V extraParams);

}
