package com.openframe.stream.handler.openframe;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.model.redis.RedisMachineTag;
import com.openframe.data.model.kafka.MachinePinotMessage;
import com.openframe.data.model.redis.RedisTag;
import com.openframe.data.service.MachineRedisService;
import com.openframe.data.service.MachineTagRedisService;
import com.openframe.data.service.TagRedisService;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class MongoMachineTagHandler extends DebeziumKafkaMessageHandler<RedisMachineTag> {

    private final MachineTagRedisService machineTagRedisService;
    private final TagRedisService tagRedisService;
    private final MachineRedisService machineRedisService;
    private String topic = "machines.pinot";

    protected MongoMachineTagHandler(KafkaTemplate<String, Object> kafkaTemplate,
                                     ObjectMapper mapper,
                                     MachineTagRedisService machineTagRedisService,
                                     TagRedisService tagRedisService, MachineRedisService machineRedisService) {
        super(kafkaTemplate, mapper);
        this.machineTagRedisService = machineTagRedisService;
        this.tagRedisService = tagRedisService;
        this.machineRedisService = machineRedisService;
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    protected RedisMachineTag transform(DebeziumMessage debeziumMessage) {
        if (debeziumMessage.getAfter() == null) {
            log.warn("After data is null");
            throw new RuntimeException("After data is null");
        }
        try {
            return mapper.readValue(debeziumMessage.getAfter(), RedisMachineTag.class);
        } catch (Exception e) {
            log.error("Failed to parse machine tag from after data", e);
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void handleCreate(RedisMachineTag data) {
        log.info("Handling CREATE for machine tag: machineId={}, tagId={}", data.getMachineId(), data.getTagId());

        // Save to Redis
        boolean saved = machineTagRedisService.saveMachineTag(data);
        if (!saved) {
            log.error("Failed to save machine tag to Redis: machineId={}, tagId={}", data.getMachineId(), data.getTagId());
            return;
        }

        // Find machine tag from Redis with tags and send to Kafka
        sendMachineWithTagsToKafka(data.getMachineId());
    }

    @Override
    protected void handleRead(RedisMachineTag data) {
        handleCreate(data);
    }

    @Override
    protected void handleUpdate(RedisMachineTag data) {
        log.info("Handling UPDATE for machine tag: machineId={}, tagId={}", data.getMachineId(), data.getTagId());

        boolean saved = machineTagRedisService.saveMachineTag(data);
        if (!saved) {
            log.error("Failed to update machine tag in Redis: machineId={}, tagId={}", data.getMachineId(), data.getTagId());
            return;
        }

        sendMachineWithTagsToKafka(data.getMachineId());
    }

    @Override
    protected void handleDelete(RedisMachineTag data) {
        log.info("Handling DELETE for machine tag: machineId={}, tagId={}", data.getMachineId(), data.getTagId());

        // Note: We don't delete from Redis here as we want to maintain the relationship
        // Just send updated machine data to Kafka
        sendMachineWithTagsToKafka(data.getMachineId());
    }

    @Override
    public MessageType getType() {
        return MessageType.OPENFRAME_MONGO_MACHINE_TAG;
    }

    /**
     * Send machine with tags to Kafka topic
     * @param machineId machine ID to find and send
     */
    private void sendMachineWithTagsToKafka(String machineId) {
        try {
            // Find all machine tags for this machine
            List<RedisMachineTag> machineTags = machineTagRedisService.getMachineTagsByMachineId(machineId);

            if (machineTags.isEmpty()) {
                log.debug("No machine tags found for machineId: {}", machineId);
                return;
            }

            // Get the first machine tag (they all have the same machineId)
            Optional<MachinePinotMessage> machineOptional = machineRedisService.getMachineWithRefresh(machineId);

            if (machineOptional.isEmpty()) {
                log.debug("No machine found for machineId: {}", machineId);
                return;
            }

            // Create machine message with tags
            MachinePinotMessage machineMessage = machineOptional.get();
            List<String> tags = new ArrayList<>();
            for (RedisMachineTag machineTag : machineTags) {
                // Get tag details from Redis
                Optional<RedisTag> tag = tagRedisService.getTag(machineTag.getTagId());
                tag.ifPresent(redisTag -> tags.add(redisTag.getName()));
            }
            machineMessage.setTags(tags);

            // Send to Kafka
            try {
                kafkaTemplate.send(getTopic(), machineMessage);
                log.info("Message sent to Kafka topic {}: {}", getTopic(), machineMessage);
            } catch (Exception e) {
                log.error("Error sending message to Kafka topic {}: {}", getTopic(), machineMessage, e);
                throw new MessageDeliveryException("Failed to send message to Kafka");
            }

        } catch (Exception e) {
            log.error("Failed to send machine with tags to Kafka: machineId={}", machineId, e);
        }
    }

    /**
     * Create MachinePinotMessage from RedisMachineTag
     * @param redisMachineTag machine tag data
     * @return MachinePinotMessage
     */
    private MachinePinotMessage createMachinePinotMessage(RedisMachineTag redisMachineTag) {
        MachinePinotMessage machineMessage = new MachinePinotMessage();
        machineMessage.setMachineId(redisMachineTag.getMachineId());

        Optional<MachinePinotMessage> machine = machineRedisService.getMachineWithRefresh(redisMachineTag.getMachineId());
        if (machine.isPresent()) {
            machineMessage.setMachineId(machine.get().getMachineId());
            machineMessage.setOrganizationId(machine.get().getOrganizationId());
            machineMessage.setDeviceType(machine.get().getDeviceType());
            machineMessage.setStatus(machine.get().getStatus());
            machineMessage.setOsType(machine.get().getOsType());
            machineMessage.setTags(machine.get().getTags());
        }
        return machineMessage;
    }
}
