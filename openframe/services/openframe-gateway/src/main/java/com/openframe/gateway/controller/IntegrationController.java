package com.openframe.gateway.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.gateway.service.IntegrationService;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/admin/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegratedToolRepository toolRepository;
    private final IntegrationService integrationService;

    @PostMapping("/{toolId}/test")
    public Mono<ResponseEntity<String>> testIntegration(@PathVariable String toolId) {
        return integrationService.testIntegrationConnection(toolId)
            .map(ResponseEntity::ok)
            .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @GetMapping("/reload")
    public ResponseEntity<?> reloadIntegrations() {
        // This will trigger Spring Cloud Gateway to rebuild routes
        // You might need to implement a custom route refresh mechanism
        return ResponseEntity.ok().build();
    }
} 