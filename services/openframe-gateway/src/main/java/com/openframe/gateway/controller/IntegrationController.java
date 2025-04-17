package com.openframe.gateway.controller;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

import com.openframe.core.model.*;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

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
    private final WebClient.Builder webClientBuilder;
    private final Environment environment;
    private static final AttributeKey<URI> TARGET_URI = AttributeKey.valueOf("target_uri");

    private URI adjustUrl(IntegratedTool integratedTool, String originalUrl, String toolId) {
        try {
            Optional<ToolUrl> toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API);

            if (!toolUrl.isPresent()) {
                throw new RuntimeException("Tool URL not found for tool: " + toolId);
            }

            URI integratedToolUri = new URI("http://tactical-backend.tactical-rmm.svc.cluster.local:8000");
            URI originalUrlUri = new URI(originalUrl);

            // Extract the path after /tools/{toolId}
            String fullPath = originalUrlUri.getPath();
            String toolPath = "/tools/agent/" + toolId;
            String pathToProxy = fullPath.substring(fullPath.indexOf(toolPath) + toolPath.length());
            if (pathToProxy.isEmpty()) {
                pathToProxy = "/";
            }

            return UriComponentsBuilder.newInstance().scheme(integratedToolUri.getScheme())
                    .host(isLocalProfile() ? "localhost" : integratedToolUri.getHost()).port(toolUrl.get().getPort())
                    .path(pathToProxy).query(originalUrlUri.getQuery()).fragment(originalUrlUri.getFragment())
                    .build(true).toUri();
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
        return integrationService.testIntegrationConnection(toolId).map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @PostMapping("/{toolId}/test")
    public Mono<ResponseEntity<String>> testIntegration(@PathVariable String toolId, Authentication auth) {
        log.info("Testing integration for tool: {}", toolId);
        return integrationService.testIntegrationConnection(toolId).map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @RequestMapping(value = "api/{toolId}/**", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.OPTIONS })
    public Mono<ResponseEntity<String>> proxyApiRequest(@PathVariable String toolId, ServerHttpRequest request,
            Authentication auth) {
        String path = request.getPath().toString();
        log.info("Proxying request for tool: {}, path: {}", toolId, path);

        return toolRepository.findById(toolId).map(Mono::just).orElse(Mono.empty()).flatMap(tool -> {
            if (!tool.isEnabled()) {
                return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
            }

            Optional<ToolUrl> toolUrl = toolUrlService.getUrlByToolType(tool, com.openframe.core.model.ToolUrlType.API);

            if (!toolUrl.isPresent()) {
                return Mono.just(ResponseEntity.badRequest().body("Tool URL not found for tool: " + toolId));
            }

            // Adjust URL based on environment
            URI targetUri = adjustUrl(tool, request.getURI().toString(), toolId);
            log.debug("Forwarding request to: {} (original URL: {})", targetUri, toolUrl.get().getUrl());

            // Create an HttpClient with the target URI in its attributes
            HttpClient httpClient = HttpClient.create().doOnConnected(conn -> {
                conn.channel().attr(TARGET_URI).set(targetUri);
                conn.addHandlerFirst("curl-logger", new CurlLoggingHandler());
            });

            // Forward the request with the tool's token
            WebClient.RequestBodySpec requestSpec = WebClient.builder()
                    .clientConnector(
                            new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient))
                    .build().method(request.getMethod()).uri(targetUri).headers(headers -> {

                        headers.set("Accept-Charset", "UTF-8");
                        headers.set("Accept-Language", "en-US,en;q=0.9");
                        headers.set("Content-Type", "application/json");
                        headers.set("Accept", "application/json");

                        ToolCredentials credentials = tool.getCredentials();
                        switch (credentials.getApiKey().getType()) {
                        case HEADER:
                            headers.set(credentials.getApiKey().getKeyName(), credentials.getApiKey().getKey());
                            break;
                        case BEARER_TOKEN:
                            if (toolId.equals("tactical-rmm")) {
                                headers.set("Authorization", "Token " + credentials.getApiKey().getKey());
                            } else {
                                headers.setBearerAuth(credentials.getApiKey().getKey());
                            }
                            break;
                        }
                    });

            // Add request body if present
            return request.getBody().map(dataBuffer -> {
                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                dataBuffer.read(bytes);
                return bytes;
            }).collectList().flatMap(bodyBytes -> {
                if (!bodyBytes.isEmpty()) {
                    byte[] fullBody = bodyBytes.stream().reduce(new byte[0], (acc, bytes) -> {
                        byte[] combined = new byte[acc.length + bytes.length];
                        System.arraycopy(acc, 0, combined, 0, acc.length);
                        System.arraycopy(bytes, 0, combined, acc.length, bytes.length);
                        return combined;
                    });
                    return requestSpec.body(BodyInserters.fromValue(fullBody)).retrieve()
                            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                    response -> response.bodyToMono(String.class)
                                            .flatMap(errorBody -> Mono.error(WebClientResponseException.create(
                                                    response.statusCode().value(), response.statusCode().toString(),
                                                    response.headers().asHttpHeaders(), errorBody.getBytes(), null))))
                            .bodyToMono(String.class).timeout(Duration.ofSeconds(30)).map(ResponseEntity::ok)
                            .onErrorResume(e -> {
                                if (e instanceof WebClientResponseException) {
                                    WebClientResponseException ex = (WebClientResponseException) e;
                                    return Mono.just(ResponseEntity.status(ex.getStatusCode())
                                            .body(ex.getResponseBodyAsString()));
                                }
                                return Mono.just(ResponseEntity.status(500).body(e.getMessage()));
                            });
                } else {
                    return requestSpec.retrieve()
                            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                    response -> response.bodyToMono(String.class)
                                            .flatMap(errorBody -> Mono.error(WebClientResponseException.create(
                                                    response.statusCode().value(), response.statusCode().toString(),
                                                    response.headers().asHttpHeaders(), errorBody.getBytes(), null))))
                            .bodyToMono(String.class).timeout(Duration.ofSeconds(30)).map(ResponseEntity::ok)
                            .onErrorResume(e -> {
                                if (e instanceof WebClientResponseException) {
                                    WebClientResponseException ex = (WebClientResponseException) e;
                                    return Mono.just(ResponseEntity.status(ex.getStatusCode())
                                            .body(ex.getResponseBodyAsString()));
                                }
                                return Mono.just(ResponseEntity.status(500).body(e.getMessage()));
                            });
                }
            }).doOnSuccess(response -> log.info("Successfully proxied request to {}", tool.getName())).doOnError(
                    error -> log.error("Failed to proxy request to {}: {}", tool.getName(), error.getMessage()));
        }).onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(e.getMessage())));
    }

    @RequestMapping(value = "agent/{toolId}/**", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.OPTIONS })
    public Mono<ResponseEntity<String>> proxyAgentRequest(@PathVariable String toolId, ServerHttpRequest request) {
        return toolRepository.findById(toolId)
                .map(Mono::just)
                .orElse(Mono.empty())
                .flatMap(tool -> {
                    if (!tool.isEnabled()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                    }
            Optional<ToolUrl> toolUrl = toolUrlService.getUrlByToolType(tool, com.openframe.core.model.ToolUrlType.API);
                    if (!toolUrl.isPresent()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool URL not found for tool: " + toolId));
                    }

                    // Adjust URL based on environment
                    URI targetUri = adjustUrl(tool, request.getURI().toString(), toolId);
                    String targetUrl = targetUri.toString();
                    log.debug("Forwarding request to: {} (original URL: {})", targetUri, toolUrl.get().getUrl());

                    String toolAuthorisation = request.getHeaders().getFirst("Tool-Authorization");

                    WebClient.RequestBodySpec requestSpec = WebClient.builder()
                            .build()
                            .method(request.getMethod())
                            .uri(targetUri)
                            .headers(headers -> {
                                headers.addAll(request.getHeaders());
                                headers.remove("Tool-Authorization");
                                headers.remove("Authorization");
                                headers.add("Authorization", toolAuthorisation);
                            });

                    // Add request body if present
                    return request.getBody().map(dataBuffer -> {
                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                        dataBuffer.read(bytes);
                        return new String(bytes);
                    })
                            .reduce(String::concat)
                            .flatMap(body -> {
                                if (!body.isEmpty()) {
                                    requestSpec.bodyValue(body);
                                }
                                 return requestSpec.body(BodyInserters.fromValue(body)).retrieve()
                            .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                    response -> response.bodyToMono(String.class)
                                            .flatMap(errorBody -> Mono.error(WebClientResponseException.create(
                                                    response.statusCode().value(), response.statusCode().toString(),
                                                    response.headers().asHttpHeaders(), errorBody.getBytes(), null))))
                            .bodyToMono(String.class).timeout(Duration.ofSeconds(30)).map(ResponseEntity::ok)
                            .onErrorResume(e -> {
                                if (e instanceof WebClientResponseException) {
                                    WebClientResponseException ex = (WebClientResponseException) e;
                                    return Mono.just(ResponseEntity.status(ex.getStatusCode())
                                            .body(ex.getResponseBodyAsString()));
                                }
                                return Mono.just(ResponseEntity.status(500).body(e.getMessage()));
                            });
                            });
                });

    }
}
