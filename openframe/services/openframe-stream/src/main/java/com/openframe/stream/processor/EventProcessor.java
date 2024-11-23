package com.openframe.stream.processor;

import com.openframe.stream.model.EventMessage;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.annotation.Backoff;

@Service
@Slf4j
@RequiredArgsConstructor
public class EventProcessor {

    private final KafkaTemplate<String, EventMessage> kafkaTemplate;
    
    @KafkaListener(topics = "openframe.events", groupId = "event-processor")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void processEvent(EventMessage event) {
        try {
            log.info("Processing event: {}", event.getId());
            event.setStatus(EventMessage.ProcessingStatus.PROCESSING);
            
            // Process event based on type
            switch (event.getType()) {
                case "USER_ACTION":
                    processUserAction(event);
                    break;
                case "SYSTEM_EVENT":
                    processSystemEvent(event);
                    break;
                default:
                    processDefaultEvent(event);
            }
            
            event.setStatus(EventMessage.ProcessingStatus.PROCESSED);
            kafkaTemplate.send("openframe.events.processed", event.getId(), event);
            
        } catch (Exception e) {
            log.error("Error processing event: {}", event.getId(), e);
            event.setStatus(EventMessage.ProcessingStatus.FAILED);
            handleFailedEvent(event, e);
        }
    }

    private void processUserAction(EventMessage event) {
        // Implement user action processing logic
    }

    private void processSystemEvent(EventMessage event) {
        // Implement system event processing logic
    }

    private void processDefaultEvent(EventMessage event) {
        // Implement default event processing logic
    }

    private void handleFailedEvent(EventMessage event, Exception e) {
        // Implement error handling and dead letter queue logic
    }
}

