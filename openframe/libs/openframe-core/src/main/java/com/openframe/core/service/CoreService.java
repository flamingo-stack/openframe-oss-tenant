package com.openframe.core.service;

import org.springframework.stereotype.Service;

import com.openframe.core.model.CoreEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CoreService {

    public void processEvent(CoreEvent event) {
        // Add business logic here
    }
}
