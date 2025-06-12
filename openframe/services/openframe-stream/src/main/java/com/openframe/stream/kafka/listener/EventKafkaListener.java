package com.openframe.stream.kafka.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.enumeration.DownstreamTool;
import com.openframe.data.model.DownstreamEntity;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.service.ITEventTransformationServiceFactory;
import com.openframe.stream.service.IntegratedToolEventTransformationService;
import com.openframe.stream.service.PushDataService;
import com.openframe.stream.service.PushDataServiceFactory;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@Slf4j
public abstract class EventKafkaListener {

    private static final Logger logger = LoggerFactory.getLogger(EventKafkaListener.class);
    private final PushDataServiceFactory pushDataServiceFactory;
    private final ITEventTransformationServiceFactory transformationServiceFactory;
    private final ObjectMapper objectMapper;

    protected EventKafkaListener(PushDataServiceFactory pushDataServiceFactory, ITEventTransformationServiceFactory transformationServiceFactory,
                                 ObjectMapper objectMapper) {
        this.pushDataServiceFactory = pushDataServiceFactory;
        this.transformationServiceFactory = transformationServiceFactory;
        this.objectMapper = objectMapper;
    }

    public abstract void listen(Map<String, Object> message);

    protected void process(Map<String, Object> message, IntegratedTool integratedTool) {
        try {
            log.info("Received message: {}", message);
            JsonNode messageJson = objectMapper.valueToTree(message);
            Map<DownstreamTool, DownstreamEntity> transformedEventMap = transform(messageJson, integratedTool);
            pushData(transformedEventMap);
        } catch (Exception e) {
            log.error("Error processing message: {}", message, e);
            throw new RuntimeException("Failed to process message", e);
        }
    }

    protected Map<DownstreamTool, DownstreamEntity> transform(JsonNode message, IntegratedTool integratedTool) {
        Map<DownstreamTool, DownstreamEntity> downstreamEntityMap = new HashMap<>();
        IntegratedToolEventTransformationService transformationService = transformationServiceFactory.getTransformationService(integratedTool);
        downstreamEntityMap.put(DownstreamTool.CASSANDRA, transformationService.transformForCassandra(message));
//        downstreamEntityMap.put(DownstreamTool.PINOT, transformationService.transformForPinot(message));
        return downstreamEntityMap;
    }

    protected void pushData(Map<DownstreamTool, DownstreamEntity> transformedEventMap) {
        transformedEventMap.forEach((key, value) -> {
            PushDataService pushDataService = pushDataServiceFactory.getPushDataService(key);
            pushDataService.pushData(value);
        });
    }

}
