package com.openframe.core.service;

import org.springframework.stereotype.Service;

import com.openframe.core.model.CoreEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j  // This annotation will create the log variable
@RequiredArgsConstructor
public class CoreService {
    
    public void processEvent(CoreEvent event) {
        log.info("Processing event: {}", event);
        // Add business logic here
    }
}