package com.openframe.stream.kafka.listener;

import com.openframe.stream.DownstreamTool;
import com.openframe.data.model.DownstreamEntity;
import com.openframe.stream.service.IntegratedToolEventTransformationService;
import com.openframe.stream.service.PushDataService;
import com.openframe.stream.service.PushDataServiceFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

public abstract class EventKafkaListener {

    private static final Logger logger = LoggerFactory.getLogger(EventKafkaListener.class);
    private final IntegratedToolEventTransformationService transformationService;
    private final PushDataServiceFactory pushDataServiceFactory;

    protected EventKafkaListener(IntegratedToolEventTransformationService transformationService, PushDataServiceFactory pushDataServiceFactory) {
        this.transformationService = transformationService;
        this.pushDataServiceFactory = pushDataServiceFactory;
    }

    public abstract void listen(String message);

    protected void process(String message) {
        Map<DownstreamTool, DownstreamEntity> transformedEventMap = transform(message);
        pushData(transformedEventMap);
    }

    protected Map<DownstreamTool, DownstreamEntity> transform(String message) {
        Map<DownstreamTool, DownstreamEntity> downstreamEntityMap = new HashMap<>();
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
