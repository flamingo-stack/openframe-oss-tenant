package com.openframe.gateway.service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolCredentials;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.config.CurlLoggingHandler;
import io.netty.util.AttributeKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.apache.commons.lang3.StringUtils.isNotEmpty;

@Service
@RequiredArgsConstructor
@Slf4j
public class RestProxyService {

    private static final AttributeKey<URI> TARGET_URI_KEY = AttributeKey.valueOf("target_uri");

    private final IntegratedToolRepository toolRepository;
    private final ProxyUrlResolver proxyUrlResolver;
    private final ToolUrlService toolUrlService;

    public Mono<ResponseEntity<String>> proxyApiRequest(String toolId, ServerHttpRequest request, String body) {
        return toolRepository.findById(toolId)
                .map(tool -> {
                    if (!tool.isEnabled()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                    }

                    String originalUrl = request.getURI().toString();

                    Optional<ToolUrl> optionalToolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);
                    if (optionalToolUrl.isEmpty()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool URL not found for tool: " + toolId));
                    }
                    ToolUrl toolUrl = optionalToolUrl.get();

                    URI targetUri = proxyUrlResolver.resolve(toolId, toolUrl, originalUrl, "/tools");
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildApiRequestHeaders(tool);

                    return proxy(tool, targetUri, method, headers, body);
                })
                .orElseGet(() -> Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tool not found: " + toolId)));
    }

    private Map<String, String> buildApiRequestHeaders(IntegratedTool tool) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Accept-Charset", "UTF-8");
        headers.put("Accept-Language", "en-US,en;q=0.9");
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");

        String toolId = tool.getId();
        ToolCredentials credentials = tool.getCredentials();
        switch (credentials.getApiKey().getType()) {
            case HEADER:
                String keyName = credentials.getApiKey().getKeyName();
                String key = credentials.getApiKey().getKey();
                headers.put(keyName, key);
                break;
            case BEARER_TOKEN:
                if (toolId.equals("tactical-rmm")) {
                    String token = credentials.getApiKey().getKey();
                    headers.put("Authorization", "Token " + token);
                } else {
                    String token = credentials.getApiKey().getKey();
                    headers.put("Authorisation", "Bearer" + token);
                }
                break;
        }

        return headers;
    }

    /*
        Currently if one device have valid open-frame machine JWT token, it can send API request for other device.
        TODO: implement device access validation after tool connection feature is implemented.

        Tactical RMM request format: 
            - GET /{agentId}/**
            - POST /**
              {
                "agentId": "*",
              }
            }
     */
    public Mono<ResponseEntity<String>> proxyAgentRequest(String toolId, ServerHttpRequest request, String body) {
        return toolRepository.findById(toolId)
                .map(tool -> {
                    if (!tool.isEnabled()) {
                        ResponseEntity<String> response = ResponseEntity.badRequest()
                                .body("Tool " + tool.getName() + " is not enabled");
                        return Mono.just(response);
                    }

                    String originalUrl = request.getURI().toString();

                    Optional<ToolUrl> optionalToolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);
                    if (optionalToolUrl.isEmpty()) {
                        ResponseEntity<String> response = ResponseEntity.badRequest()
                                .body("Tool URL not found for tool: " + toolId);
                        return Mono.just(response);
                    }
                    ToolUrl toolUrl = optionalToolUrl.get();

                    URI targetUri = proxyUrlResolver.resolve(toolId, toolUrl, originalUrl, "/tools/agent");
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildAgentRequestHeaders(request);

                    return proxy(tool, targetUri, method, headers, body);
                })
                .orElseGet(() -> Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tool not found: " + toolId)));
    }

    private Map<String, String> buildAgentRequestHeaders(ServerHttpRequest request) {
        HttpHeaders requestHeaders = request.getHeaders();
        String toolAuthorisation = requestHeaders.getFirst("Tool-Authorization");
        return Map.of(
                "Accept", "application/json",
                "Content-Type", "application/json",
                "Authorization", toolAuthorisation
        );
    }

    private Mono<ResponseEntity<String>> proxy(
            IntegratedTool tool,
            URI targetUri,
            HttpMethod method,
            Map<String, String> proxyHeaders,
            String body
        ) {
        WebClient.RequestBodySpec requestSpec = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(buildHttpClient(targetUri)))
                .build()
                .method(method)
                .uri(targetUri)
                .headers(headers -> headers.setAll(proxyHeaders));

        if (isNotEmpty(body)) {
            requestSpec.bodyValue(body);
        }

        return requestSpec
                .retrieve()
                .onStatus(this::isErrorStatusCode, this::processErrorResponse)
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30))
                .map(ResponseEntity::ok)
                .onErrorResume(this::buildErrorResponse)
                .doOnSuccess(response ->
                        log.info("Successfully proxied request to {}", tool.getName()))
                .doOnError(error ->
                        log.error("Failed to proxy request to {}: {}", tool.getName(), error.getMessage()));
    }

    private HttpClient buildHttpClient(URI targetUri) {
        return HttpClient.create()
                .doOnConnected(conn -> {
                    conn.channel().attr(TARGET_URI_KEY).set(targetUri);
                    conn.addHandlerFirst("curl-logger", new CurlLoggingHandler());
                });
    }

    private boolean isErrorStatusCode(HttpStatusCode statusCode) {
        return statusCode.is4xxClientError() || statusCode.is5xxServerError();
    }

    private Mono<Throwable> processErrorResponse(ClientResponse response) {
        return response.bodyToMono(String.class)
                .flatMap(errorBody -> Mono.error(
                        WebClientResponseException.create(
                                response.statusCode().value(),
                                response.statusCode().toString(),
                                response.headers().asHttpHeaders(),
                                errorBody.getBytes(),
                                null)
                ));
    }

    private Mono<ResponseEntity<String>> buildErrorResponse(Throwable e) {
        if (e instanceof WebClientResponseException responseException) {
            ResponseEntity<String> response = ResponseEntity.status(responseException.getStatusCode())
                    .body(responseException.getResponseBodyAsString());
            return Mono.just(response);
        }
        ResponseEntity<String> response = ResponseEntity.status(500).body(e.getMessage());
        return Mono.just(response);
    }
}
