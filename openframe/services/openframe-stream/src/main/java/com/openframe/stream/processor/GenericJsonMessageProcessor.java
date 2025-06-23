package com.openframe.stream.processor;

import com.openframe.data.model.debezium.DebeziumIntegratedToolMessage;
import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.deserializer.KafkaMessageDeserializer;
import com.openframe.stream.enumeration.DataEnrichmentServiceType;
import com.openframe.stream.enumeration.DeserializerType;
import com.openframe.stream.enumeration.Destination;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.MessageHandler;
import com.openframe.stream.service.DataEnrichmentService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GenericJsonMessageProcessor {

    private final Map<MessageType, Map<Destination, MessageHandler>> handlers;
    private final Map<DataEnrichmentServiceType, DataEnrichmentService> dataEnrichmentServices;
    private final Map<DeserializerType, KafkaMessageDeserializer> deserializers;

    public GenericJsonMessageProcessor(List<MessageHandler> handlers, List<DataEnrichmentService> dataEnrichmentServices, List<KafkaMessageDeserializer> deserializers) {
        this.handlers = handlers.stream()
                .collect(Collectors.groupingBy(
                        MessageHandler::getType,
                        Collectors.toMap(
                                MessageHandler::getDestination,
                                Function.identity()
                        )
                ));
        this.dataEnrichmentServices = dataEnrichmentServices.stream()
                .collect(Collectors.toMap(DataEnrichmentService::getType, Function.identity()));
        this.deserializers = deserializers.stream()
                .collect(Collectors.toMap(KafkaMessageDeserializer::getType, Function.identity()));
    }

    public void process(Map<String, Object> message, MessageType type) {
        DeserializedKafkaMessage deserializedKafkaMessage = deserialize(message, type);
        ExtraParams extraParams = getExtraParams(deserializedKafkaMessage, type);
        type.getDestinationList().forEach(destination -> {
            MessageHandler handler = handlers.get(type).get(destination);
            if (handler == null) {
                throw new IllegalArgumentException("No handler found for type: " + type);
            }
            handler.handle(deserializedKafkaMessage, extraParams);
        });
    }

    private DeserializedKafkaMessage deserialize(Map<String, Object> message, MessageType type) {
        KafkaMessageDeserializer deserializer = deserializers.get(type.getDeserializerType());
        return deserializer.deserialize(message);
    }

    private ExtraParams getExtraParams(DeserializedKafkaMessage message, MessageType messageType) {
        DataEnrichmentService dataEnrichmentService = dataEnrichmentServices.get(messageType);
        return dataEnrichmentService.getExtraParams(message);
    }

}
