package com.openframe.stream.processor;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import com.openframe.stream.model.EventMessage;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventProcessor {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "openframe.events", groupId = "event-processor")
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void processEvent(EventMessage event) {
        try {
            System.out.println(String.format("Processing event: {}", event.getId()));
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
            System.out.println(String.format("Error processing event: {}", event.getId(), e));
            event.setStatus(EventMessage.ProcessingStatus.FAILED);
            handleFailedEvent(event, e);
        }
    }

    private void processUserAction(EventMessage event) {
        // Implement user action processing logic
        System.out.println(String.format("Processing user action: {}", event));
    }

    private void processSystemEvent(EventMessage event) {
        // Implement system event processing logic
        System.out.println(String.format("Processing system event: {}", event));
    }

    private void processDefaultEvent(EventMessage event) {
        // Implement default event processing logic
        System.out.println(String.format("Processing default event: {}", event));
    }

    private void handleFailedEvent(EventMessage event, Exception e) {
        // Implement error handling and dead letter queue logic
        System.out.println(String.format("Failed to process event: {}", event, e));
    }
}
