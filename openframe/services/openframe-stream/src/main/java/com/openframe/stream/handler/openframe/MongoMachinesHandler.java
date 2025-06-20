package com.openframe.stream.handler.openframe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.model.kafka.MachinePinotMessage;
import com.openframe.data.service.MachineRedisService;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
public class MongoMachinesHandler extends DebeziumKafkaMessageHandler<MachinePinotMessage> {

//    @Value("${kafka.producer.topic.openframe.machines.name}")
    private String topic = "machines.pinot";
    private final MachineRedisService machineRedisService;

    public MongoMachinesHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper, MachineRedisService machineRedisService) {
        super(kafkaTemplate, objectMapper);
        this.machineRedisService = machineRedisService;
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
                String afterJson = message.getAfter();
                if (!afterJson.isEmpty()) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode afterData = mapper.readTree(afterJson);

                    if (afterData.has("machineId")) {
                        transformedMessage.setMachineId(afterData.get("machineId").asText());
                        List<String> tags = "u".equalsIgnoreCase(message.getOperation())
                                ? machineRedisService.getMachineWithRefresh(transformedMessage.getMachineId()).map(MachinePinotMessage::getTags)
                                .orElse(List.of()) : List.of();
                        transformedMessage.setTags(tags);
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

    protected void handleCreate(MachinePinotMessage message) {
        super.handleCreate(message);
        machineRedisService.saveMachine(message);
    }

    @Override
    public MessageType getType() {
        return MessageType.OPENFRAME_MONGO_MACHINES;
    }
}
