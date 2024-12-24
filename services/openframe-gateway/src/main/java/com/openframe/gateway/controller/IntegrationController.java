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

import com.openframe.data.model.IntegratedTool;
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

    private URI adjustUrl(IntegratedTool integratedTool, String originalUrl, String toolId) {
        try {
            URI integratedToolUri = new URI(integratedTool.getUrl());
            URI originalUrlUri = new URI(originalUrl);
            
            // Extract the path after /tools/{toolId}
            String fullPath = originalUrlUri.getPath();
            String toolPath = "/tools/" + toolId;
            String pathToProxy = fullPath.substring(fullPath.indexOf(toolPath) + toolPath.length());
            if (pathToProxy.isEmpty()) {
                pathToProxy = "/";
            }

            return UriComponentsBuilder.newInstance()
                    .scheme(integratedToolUri.getScheme())
                    .host(isLocalProfile() ? "localhost" : integratedToolUri.getHost())
                    .port(integratedTool.getPort())
                    .path(pathToProxy)
                    .query(originalUrlUri.getQuery())
                    .fragment(originalUrlUri.getFragment())
                    .build(true)
                    .toUri();
        } catch (Exception e) {
            log.error("Failed to parse URL: {}", originalUrl, e);
            return URI.create(originalUrl);
        }
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

        return Mono.justOrEmpty(toolRepository.findById(toolId))
                .flatMap(tool -> {
                    if (!tool.isEnabled()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                    }

                    // Adjust URL based on environment
                    URI targetUri = adjustUrl(tool, request.getURI().toString(), toolId);
                    log.debug("Forwarding request to: {} (original URL: {})", targetUri, tool.getUrl());

                    // Forward the request with the tool's token
                    return webClientBuilder.build()
                            .method(request.getMethod())
                            .uri(targetUri)
                            .headers(headers -> {
                                headers.addAll(request.getHeaders());
                                // Use the token from the tool's credentials
                                if (tool.getCredentials() != null && tool.getCredentials().getToken() != null) {
                                    headers.setBearerAuth(tool.getCredentials().getToken());
                                }
                            })
                            .retrieve()
                            .bodyToMono(String.class)
                            .map(ResponseEntity::ok)
                            .doOnSuccess(response -> log.info("Successfully proxied request to {}", tool.getName()))
                            .doOnError(error -> log.error("Failed to proxy request to {}: {}", tool.getName(), error.getMessage()));
                })
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }
}
