package com.openframe.data.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.data.model.kafka.MachinePinotMessage;
import com.openframe.data.model.redis.RedisTag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class RedisConfig {

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        log.info("Creating RedisTemplate<String, String> bean");
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisTemplate<String, RedisTag> tagRedisTemplate(RedisConnectionFactory connectionFactory) {
        log.info("Creating RedisTemplate<String, Tag> bean");
        return createTypedRedisTemplate(connectionFactory, RedisTag.class, "tag");
    }

    @Bean
    public RedisTemplate<String, MachinePinotMessage> machineRedisTemplate(RedisConnectionFactory connectionFactory) {
        log.info("Creating RedisTemplate<String, Machine> bean");
        return createTypedRedisTemplate(connectionFactory, MachinePinotMessage.class, "machine");
    }

    @Bean
    public RedisTemplate<String, MachineTag> machineTagRedisTemplate(RedisConnectionFactory connectionFactory) {
        log.info("Creating RedisTemplate<String, MachineTag> bean");
        return createTypedRedisTemplate(connectionFactory, MachineTag.class, "machineTag");
    }

    /**
     * Creates a typed RedisTemplate for the specified class
     * @param connectionFactory Redis connection factory
     * @param clazz object class
     * @param typeName type name for logging
     * @return configured RedisTemplate
     */
    private <T> RedisTemplate<String, T> createTypedRedisTemplate(
            RedisConnectionFactory connectionFactory, 
            Class<T> clazz, 
            String typeName) {
        
        log.debug("Creating typed RedisTemplate for class: {}", clazz.getSimpleName());
        
        RedisTemplate<String, T> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Configure serialization for keys (String)
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Configure serialization for values (objects)
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        
        GenericJackson2JsonRedisSerializer jsonSerializer = 
            new GenericJackson2JsonRedisSerializer(objectMapper);
        
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        
        log.debug("Successfully created RedisTemplate for type: {}", typeName);
        return template;
    }
}