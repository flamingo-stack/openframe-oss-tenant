package com.openframe.data.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "false", matchIfMissing = false)
public class ConfigurationLoggerNoCassandra {
    private static final Logger logger = LoggerFactory.getLogger(ConfigurationLoggerNoCassandra.class);

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;
    
    @Value("${spring.data.redis.host}")
    private String redisHost;
    
    @Value("${pinot.controller.url}")
    private String pinotControllerUrl;
    
    @Value("${pinot.broker.url}")
    private String pinotBrokerUrl;

    @EventListener
    public void logConfiguration(ApplicationReadyEvent event) {
        logger.info("Application Configuration:");
        logger.info("MongoDB URI: {}", mongoUri);
        logger.info("Redis Host: {}", redisHost);
        logger.info("Pinot Controller URL: {}", pinotControllerUrl);
        logger.info("Pinot Broker URL: {}", pinotBrokerUrl);
    }
}
