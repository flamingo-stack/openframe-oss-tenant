package com.openframe.data.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.data.repository.cassandra.EventStreamRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
public class TestController {
    private final EventStreamRepository eventStreamRepository;
} 