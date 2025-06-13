package com.openframe.stream.events.handler.meshcentral;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.kafka.KafkaITPinotMessage;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.KafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Slf4j
public class MeshEventKafkaHandler extends KafkaMessageHandler<KafkaITPinotMessage> {

    @Value("${kafka.producer.topic.event.meshcentral.name}")
    private String topic;

    public MeshEventKafkaHandler(KafkaTemplate<String, KafkaITPinotMessage> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    public MessageType getType() {
        return MessageType.MESH_MONGO_EVENT_TO_KAFKA;
    }

    @Override
    protected KafkaITPinotMessage transform(JsonNode rootNode) {
        KafkaITPinotMessage message = new KafkaITPinotMessage();
        try {
            if (rootNode.has("eventType")) {
                message.setEventType(rootNode.get("eventType").asText());
            }
            message.setTimestamp(Instant.now());
            message.setToolName(IntegratedTool.MESHCENTRAL.getName());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }
}
