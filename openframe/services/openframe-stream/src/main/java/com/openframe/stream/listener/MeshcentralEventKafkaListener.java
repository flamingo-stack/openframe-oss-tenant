package com.openframe.stream.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.service.ITEventTransformationServiceFactory;
import com.openframe.stream.PushDataServiceFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class MeshcentralEventKafkaListener extends EventKafkaListener {


    protected MeshcentralEventKafkaListener(PushDataServiceFactory pushDataServiceFactory,
                                            ITEventTransformationServiceFactory itEventTransformationServiceFactory,
                                            ObjectMapper objectMapper) {
        super(pushDataServiceFactory, itEventTransformationServiceFactory, objectMapper);
    }

    @Override
    @KafkaListener(topics = "${kafka.topic.event.meshcentral.name}", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(Map<String, Object> message) {
        process(message, IntegratedTool.MESHCENTRAL);
    }
} 