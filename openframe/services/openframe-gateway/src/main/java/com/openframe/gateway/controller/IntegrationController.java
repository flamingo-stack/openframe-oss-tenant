package com.openframe.gateway.controller;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

import com.openframe.core.model.ToolCredentials;
import com.openframe.core.model.ToolUrl;
import com.openframe.gateway.service.RestProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.config.CurlLoggingHandler;
import com.openframe.gateway.service.IntegrationService;

import io.netty.util.AttributeKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

@RestController
@RequestMapping("/tools")
@RequiredArgsConstructor
@Slf4j
public class IntegrationController {

    private final IntegratedToolRepository toolRepository;
    private final IntegrationService integrationService;
    private final ToolUrlService toolUrlService;
    private final RestProxyService restProxyService;
    private static final AttributeKey<URI> TARGET_URI = AttributeKey.valueOf("target_uri");

    @GetMapping("/{toolId}/health")
    public Mono<ResponseEntity<String>> healthCheck(@PathVariable String toolId, Authentication auth) {
        log.info("Checking health for tool: {}", toolId);
        return integrationService.testIntegrationConnection(toolId).map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @PostMapping("/{toolId}/test")
    public Mono<ResponseEntity<String>> testIntegration(@PathVariable String toolId, Authentication auth) {
        log.info("Testing integration for tool: {}", toolId);
        return integrationService.testIntegrationConnection(toolId).map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @RequestMapping(
            value = "{toolId}/**",
            method = {
                    RequestMethod.GET,
                    RequestMethod.POST,
                    RequestMethod.PUT,
                    RequestMethod.PATCH,
                    RequestMethod.DELETE,
                    RequestMethod.OPTIONS
            })
    public Mono<ResponseEntity<String>> proxyApiRequest(
            @PathVariable String toolId,
            ServerHttpRequest request,
            @RequestBody String body
    ) {
        String path = request.getPath().toString();
        log.info("Proxying api request for tool: {}, path: {}", toolId, path);
        return restProxyService.proxyApiRequest(toolId, request, body);
    }

    @RequestMapping(
            value = "agent/{toolId}/**",
            method = {
                    RequestMethod.GET,
                    RequestMethod.POST,
                    RequestMethod.PUT,
                    RequestMethod.PATCH,
                    RequestMethod.DELETE,
                    RequestMethod.OPTIONS
            })
    public Mono<ResponseEntity<String>> proxyAgentRequest(
            @PathVariable String toolId,
            ServerHttpRequest request,
            @RequestBody String body,
            Authentication auth) {
        String path = request.getPath().toString();
        log.info("Proxying agent request for tool: {}, path: {}", toolId, path);
        return restProxyService.proxyAgentRequest(toolId, request, body);
    }

}
