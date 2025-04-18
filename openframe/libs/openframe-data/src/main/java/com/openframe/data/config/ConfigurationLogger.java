package com.openframe.data.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ConfigurationLogger {
    private static final Logger logger = LoggerFactory.getLogger(ConfigurationLogger.class);

    @Value("${spring.data.mongodb.uri:#{null}}")
    private String mongoUri;
    
    @Value("${spring.data.cassandra.contact-points:#{null}}")
    private String cassandraContactPoints;
    
    @Value("${spring.data.redis.host:#{null}}")
    private String redisHost;
    
    @Value("${pinot.controller.url:#{null}}")
    private String pinotControllerUrl;
    
    @Value("${pinot.broker.url:#{null}}")
    private String pinotBrokerUrl;

    @EventListener
    public void logConfiguration(ApplicationReadyEvent event) {
        logger.info("Application Configuration:");
        logger.info("MongoDB URI: {}", mongoUri);
        logger.info("Cassandra Contact Points: {}", cassandraContactPoints);
        logger.info("Redis Host: {}", redisHost);
        logger.info("Pinot Controller URL: {}", pinotControllerUrl);
        logger.info("Pinot Broker URL: {}", pinotBrokerUrl);
    }

} 