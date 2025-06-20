package com.openframe.stream.handler.openframe;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.model.redis.RedisTag;
import com.openframe.data.service.TagRedisService;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MongoTagsHandler extends DebeziumMessageHandler<RedisTag> {
    
    private final TagRedisService tagRedisService;

    public MongoTagsHandler(ObjectMapper mapper, TagRedisService tagRedisService) {
        super(mapper);
        this.tagRedisService = tagRedisService;
    }

    @Override
    protected void handleCreate(RedisTag tag) {
        try {
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

    @Override
    protected void handleRead(RedisTag tag) {
        handleCreate(tag);
    }

    @Override
    protected void handleUpdate(RedisTag tag) {
        try {
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

    @Override
    protected void handleDelete(RedisTag tag) {
        try {
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

    @Override
    protected RedisTag transform(DebeziumMessage debeziumMessage) {
        if (debeziumMessage.getAfter() == null) {
            log.warn("After data is null");
            throw new RuntimeException("After data is null");
        }

        try {
            return mapper.readValue(debeziumMessage.getAfter(), RedisTag.class);
        } catch (Exception e) {
            log.error("Failed to parse tag from after data", e);
            throw new RuntimeException(e);
        }
    }
}
