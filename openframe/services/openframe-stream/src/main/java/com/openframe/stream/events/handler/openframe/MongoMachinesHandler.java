package com.openframe.stream.events.handler.openframe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.kafka.MachinePinotMessage;
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
public class MongoMachinesHandler extends KafkaMessageHandler<MachinePinotMessage> {

//    @Value("${kafka.producer.topic.openframe.machines.name}")
    private String topic = "machines.pinot";

    public MongoMachinesHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    protected MachinePinotMessage transform(JsonNode messageJson) {
        MachinePinotMessage message = new MachinePinotMessage();
        try {
            if (messageJson.has("payload") && messageJson.get("payload").has("after")) {
                JsonNode afterNode = messageJson.get("payload").get("after");
                if (afterNode.isTextual()) {
                    String afterJson = afterNode.asText();
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode afterData = mapper.readTree(afterJson);

                    if (afterData.has("machineId")) {
                        message.setMachineId(afterData.get("machineId").asText());
                    }

                    if (afterData.has("organizationId")) {
                        message.setOrganizationId(afterData.get("organizationId").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw new RuntimeException();
        }
        return message;
    }

    @Override
    public MessageType getType() {
        return MessageType.OPENFRAME_MONGO_MACHINES;
    }
}
