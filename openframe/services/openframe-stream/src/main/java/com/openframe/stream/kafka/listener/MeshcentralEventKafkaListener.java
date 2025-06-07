package com.openframe.stream.kafka.listener;

import com.openframe.stream.service.IntegratedToolEventTransformationService;
import com.openframe.stream.service.PushDataServiceFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class MeshcentralEventKafkaListener extends EventKafkaListener {

    private static final Logger logger = LoggerFactory.getLogger(MeshcentralEventKafkaListener.class);

    protected MeshcentralEventKafkaListener(IntegratedToolEventTransformationService meshcentralEventTransformationService,
                                            PushDataServiceFactory pushDataServiceFactory) {
        super(meshcentralEventTransformationService, pushDataServiceFactory);
    }

    @Override
    @KafkaListener(topics = "${kafka.topic.event.meshcentral.name}", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(String message) {
        logger.info("Received message: {}", message);
        process(message);
    }
} 