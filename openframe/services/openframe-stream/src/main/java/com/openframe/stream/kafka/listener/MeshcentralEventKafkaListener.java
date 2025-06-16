package com.openframe.stream.kafka.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.service.IntegratedToolEventTransformationService;
import com.openframe.stream.service.PushDataServiceFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MeshcentralEventKafkaListener extends EventKafkaListener {

    private static final Logger logger = LoggerFactory.getLogger(MeshcentralEventKafkaListener.class);
    private final ObjectMapper objectMapper;

    protected MeshcentralEventKafkaListener(IntegratedToolEventTransformationService meshcentralEventTransformationService,
                                            PushDataServiceFactory pushDataServiceFactory,
                                            ObjectMapper objectMapper) {
        super(meshcentralEventTransformationService, pushDataServiceFactory);
        this.objectMapper = objectMapper;
    }

    @Override
    @KafkaListener(topics = "${kafka.topic.event.meshcentral.name}", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(Map<String, Object> message) {
        try {
            JsonNode messageJson = objectMapper.valueToTree(message);
            logger.info("Received message: {}", messageJson);
            process(messageJson);
        } catch (Exception e) {
            logger.error("Error processing message: {}", message, e);
            throw new RuntimeException("Failed to process message", e);
        }
    }
} 