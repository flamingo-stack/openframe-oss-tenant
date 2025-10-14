package com.openframe.client.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import static org.apache.commons.lang3.StringUtils.isEmpty;

@Component
@Slf4j
public class NatsTopicMachineIdExtractor {
    
    public String extract(String subject) {
        if (isEmpty(subject)) {
            throw new IllegalArgumentException("NATS subject cannot be empty");
        }
        
        String[] parts = subject.split("\\.");
        if (parts.length < 3 || !"machine".equals(parts[0])) {
            throw new IllegalArgumentException(
                String.format("Invalid NATS subject format. Expected: machine.{machineId}.{suffix}, got: %s", subject)
            );
        }
        
        String machineId = parts[1];
        if (isEmpty(machineId)) {
            throw new IllegalArgumentException("Machine ID is empty in subject: " + subject);
        }
        
        log.debug("Extracted machineId '{}' from subject '{}'", machineId, subject);
        return machineId;
    }
}

