package com.openframe.gateway.controller;

import java.net.URI;

import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.gateway.service.IntegrationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/tools")
@RequiredArgsConstructor
@Slf4j
public class IntegrationController {

    private final IntegratedToolRepository toolRepository;
    private final IntegrationService integrationService;
    private final WebClient.Builder webClientBuilder;
    private final Environment environment;

    private String adjustUrl(String originalUrl) {
        if (isLocalProfile()) {
            try {
                URI uri = new URI(originalUrl);
                return UriComponentsBuilder.newInstance()
                    .scheme(uri.getScheme())
                    .host("localhost")
                    .port(uri.getPort())
                    .path(uri.getPath())
                    .query(uri.getQuery())
                    .fragment(uri.getFragment())
                    .build()
                    .toUriString();
            } catch (Exception e) {
                log.error("Failed to parse URL: {}", originalUrl, e);
                return originalUrl;
            }
        }
        return originalUrl;
    }

    private boolean isLocalProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equals("local")) {
                return true;
            }
        }
        return environment.getActiveProfiles().length == 0; // Default to local if no profile set
    }

    @GetMapping("/{toolId}/health")
    public Mono<ResponseEntity<String>> healthCheck(@PathVariable String toolId, Authentication auth) {
        log.info("Checking health for tool: {}", toolId);
        return integrationService.testIntegrationConnection(toolId)
            .map(ResponseEntity::ok)
            .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @PostMapping("/{toolId}/test")
    public Mono<ResponseEntity<String>> testIntegration(@PathVariable String toolId, Authentication auth) {
        log.info("Testing integration for tool: {}", toolId);
        return integrationService.testIntegrationConnection(toolId)
            .map(ResponseEntity::ok)
            .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @GetMapping("/{toolId}/**")
    public Mono<ResponseEntity<String>> proxyRequest(@PathVariable String toolId, ServerHttpRequest request) {
        String path = request.getPath().toString();
        log.info("Proxying request for tool: {}, path: {}", toolId, path);
        
        // Don't proxy if it's a health check or test endpoint
        if (path.endsWith("/health") || path.endsWith("/test")) {
            log.debug("Skipping proxy for health/test endpoint");
            return Mono.just(ResponseEntity.notFound().build());
        }
        
        return Mono.justOrEmpty(toolRepository.findById(toolId))
            .flatMap(tool -> {
                if (!tool.isEnabled()) {
                    return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                }

                // Extract the path after /tools/{toolId}
                String remainingPath = path.substring(path.indexOf(toolId) + toolId.length());
                if (remainingPath.isEmpty()) {
                    remainingPath = "/";
                }

                // Adjust URL based on environment
                String targetUrl = adjustUrl(tool.getUrl());
                log.debug("Forwarding request to: {}{} (original URL: {})", targetUrl, remainingPath, tool.getUrl());
                
                // Forward the request
                return webClientBuilder.build()
                    .method(request.getMethod())
                    .uri(targetUrl + remainingPath)
                    .headers(headers -> headers.addAll(request.getHeaders()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .map(ResponseEntity::ok)
                    .doOnSuccess(response -> log.info("Successfully proxied request to {}", tool.getName()))
                    .doOnError(error -> log.error("Failed to proxy request to {}: {}", tool.getName(), error.getMessage()));
            })
            .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }
} 