package com.openframe.stream.handler.openframe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.core.model.Tag;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.service.TagRedisService;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.GenericMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MongoTagsHandler extends GenericMessageHandler<DebeziumMessage> {
    
    private final TagRedisService tagRedisService;
    private final ObjectMapper objectMapper;

    public MongoTagsHandler(ObjectMapper mapper, TagRedisService tagRedisService) {
        super(mapper);
        this.tagRedisService = tagRedisService;
        this.objectMapper = mapper;
    }

    @Override
    protected DebeziumMessage transform(JsonNode messageJson) {
        try {
            return objectMapper.treeToValue(messageJson, DebeziumMessage.class);
        } catch (Exception e) {
            log.error("Failed to transform message to DebeziumMessage", e);
            return null;
        }
    }

    @Override
    protected void pushData(DebeziumMessage data) {
        if (data == null) {
            log.warn("Received null DebeziumMessage, skipping processing");
            return;
        }

        try {
            String operation = data.getOperation();
            log.debug("Processing tag operation: {} for collection: {}", 
                     operation, data.getSource().getCollection());

            switch (operation) {
                case "c": // Create
                case "r": // Read (snapshot)
                    handleCreateOrRead(data);
                    break;
                case "u": // Update
                    handleUpdate(data);
                    break;
                case "d": // Delete
                    handleDelete(data);
                    break;
                default:
                    log.warn("Unknown operation type: {}", operation);
            }
        } catch (Exception e) {
            log.error("Failed to process tag message", e);
        }
    }

    private void handleCreateOrRead(DebeziumMessage data) {
        if (data.getAfter() == null) {
            log.warn("After data is null for create/read operation");
            return;
        }

        try {
            Tag tag = objectMapper.readValue(data.getAfter(), Tag.class);
            boolean success = tagRedisService.saveTag(tag);
            
            if (success) {
                log.info("Tag saved to Redis successfully: {}", tag.getId());
            } else {
                log.error("Failed to save tag to Redis: {}", tag.getId());
            }
        } catch (Exception e) {
            log.error("Failed to parse tag from after data", e);
        }
    }

    private void handleUpdate(DebeziumMessage data) {
        if (data.getAfter() == null) {
            log.warn("After data is null for update operation");
            return;
        }

        try {
            Tag tag = objectMapper.readValue(data.getAfter(), Tag.class);
            boolean success = tagRedisService.saveTag(tag);
            
            if (success) {
                log.info("Tag updated in Redis successfully: {}", tag.getId());
            } else {
                log.error("Failed to update tag in Redis: {}", tag.getId());
            }
        } catch (Exception e) {
            log.error("Failed to parse tag from after data for update", e);
        }
    }

    private void handleDelete(DebeziumMessage data) {
        if (data.getBefore() == null) {
            log.warn("Before data is null for delete operation");
            return;
        }

        try {
            Tag tag = objectMapper.readValue(data.getBefore(), Tag.class);
            boolean success = tagRedisService.deleteTag(tag.getId());
            
            if (success) {
                log.info("Tag deleted from Redis successfully: {}", tag.getId());
            } else {
                log.error("Failed to delete tag from Redis: {}", tag.getId());
            }
        } catch (Exception e) {
            log.error("Failed to parse tag from before data for delete", e);
        }
    }

    @Override
    public MessageType getType() {
        return MessageType.OPENFRAME_MONGO_TAGS;
    }
}
