package com.openframe.data.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.openframe.core.model.Machine;
import com.openframe.core.model.Tag;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class RedisConfig {

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        return template;
    }

    @Bean
    public RedisTemplate<String, Tag> tagRedisTemplate(RedisConnectionFactory connectionFactory) {
        return createTypedRedisTemplate(connectionFactory, Tag.class, "tag");
    }

    @Bean
    public RedisTemplate<String, Machine> machineRedisTemplate(RedisConnectionFactory connectionFactory) {
        return createTypedRedisTemplate(connectionFactory, Machine.class, "machine");
    }

    /**
     * Создает типизированный RedisTemplate для указанного класса
     * @param connectionFactory фабрика соединений Redis
     * @param clazz класс объекта
     * @param typeName имя типа для логирования
     * @return настроенный RedisTemplate
     */
    private <T> RedisTemplate<String, T> createTypedRedisTemplate(
            RedisConnectionFactory connectionFactory, 
            Class<T> clazz, 
            String typeName) {
        
        RedisTemplate<String, T> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Настройка сериализации для ключей (String)
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Настройка сериализации для значений (объекты)
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
        
        return template;
    }
}