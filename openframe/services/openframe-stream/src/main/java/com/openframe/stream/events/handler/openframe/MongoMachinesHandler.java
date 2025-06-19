package com.openframe.stream.events.handler.openframe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.model.kafka.MachinePinotMessage;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MongoMachinesHandler extends DebeziumKafkaMessageHandler<MachinePinotMessage> {

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
    protected MachinePinotMessage transform(DebeziumMessage message) {
        MachinePinotMessage transformedMessage = new MachinePinotMessage();
        try {
            if (message.getAfter() != null) {
                JsonNode afterNode = message.getAfter();
                if (afterNode.isTextual()) {
                    String afterJson = afterNode.asText();
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode afterData = mapper.readTree(afterJson);

                    if (afterData.has("machineId")) {
                        transformedMessage.setMachineId(afterData.get("machineId").asText());
                    }

                    if (afterData.has("organizationId")) {
                        transformedMessage.setOrganizationId(afterData.get("organizationId").asText());
                    }
                    if (afterData.has("type")) {
                        transformedMessage.setDeviceType(afterData.get("type").asText());
                    }
                    if (afterData.has("status")) {
                        transformedMessage.setStatus(afterData.get("status").asText());
                    }
                    if (afterData.has("osType")) {
                        transformedMessage.setOsType(afterData.get("osType").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw new RuntimeException();
        }
        return transformedMessage;
    }

    @Override
    public MessageType getType() {
        return MessageType.OPENFRAME_MONGO_MACHINES;
    }
}
