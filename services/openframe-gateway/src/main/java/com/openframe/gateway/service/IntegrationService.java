package com.openframe.gateway.service;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.openframe.data.model.IntegratedTool;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.IntegratedToolService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationService {
    
    private final IntegratedToolRepository toolRepository;
    private final IntegratedToolService toolService;
    private final WebClient.Builder webClientBuilder;

    public Mono<String> testIntegrationConnection(String toolId) {
        return Mono.justOrEmpty(toolRepository.findById(toolId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Tool not found: " + toolId)))
            .flatMap(tool -> {
                if (!tool.isEnabled()) {
                    return Mono.error(new IllegalStateException("Integration " + tool.getName() + " is not enabled"));
                }

                return webClientBuilder.build()
                    .get()
                    .uri(tool.getUrl() + "/health")
                    .headers(headers -> addToolHeaders(headers, tool))
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnSuccess(response -> log.info("Successfully connected to {} integration", tool.getName()))
                    .doOnError(error -> log.error("Failed to connect to {} integration: {}", tool.getName(), error.getMessage()));
            });
    }

    private void addToolHeaders(HttpHeaders headers, IntegratedTool tool) {
        String token = toolService.getActiveToken(tool.getType());
        if (token != null) {
            headers.setBearerAuth(token);
        }
    }
} 