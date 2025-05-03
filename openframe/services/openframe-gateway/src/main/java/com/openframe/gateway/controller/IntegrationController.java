package com.openframe.gateway.controller;

import com.openframe.gateway.service.IntegrationService;
import com.openframe.gateway.service.RestProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/tools")
@RequiredArgsConstructor
@Slf4j
public class IntegrationController {

    private final IntegrationService integrationService;
    private final RestProxyService restProxyService;

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
            @RequestBody(required = false) String body
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
            @RequestBody(required = false) String body
    ) {
        String path = request.getPath().toString();
        log.info("Proxying agent request for tool: {}, path: {}", toolId, path);
        return restProxyService.proxyAgentRequest(toolId, request, body);
    }

}
