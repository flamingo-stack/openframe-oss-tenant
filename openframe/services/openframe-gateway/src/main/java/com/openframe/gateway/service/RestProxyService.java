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
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.*;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
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
    private final ToolUrlResolveService toolUrlResolveService;
    private final ToolUrlService toolUrlService;

    public Mono<ResponseEntity<String>> proxyApiRequest(String toolId, ServerHttpRequest request) {
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

                    URI targetUri = toolUrlResolveService.resolve(toolId, toolUrl, originalUrl);
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildApiRequestHeaders(tool);
                    return proxy(tool, targetUri, request, headers, null);
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
        Currently if one device have valid openframe machine JWT token, it can send API request for other device.
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
                        return Mono.just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                    }

                    String originalUrl = request.getURI().toString();

                    Optional<ToolUrl> optionalToolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);
                    if (optionalToolUrl.isEmpty()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool URL not found for tool: " + toolId));
                    }
                    ToolUrl toolUrl = optionalToolUrl.get();

                    URI targetUri = toolUrlResolveService.resolve(toolId, toolUrl, originalUrl);
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildApiRequestHeaders(tool);
                    return proxy(tool, targetUri, request, headers, body);
                })
                .orElseGet(() -> Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tool not found: " + toolId)));
    }

    private Map<String, String> setAgentRequestHeaders(ServerHttpRequest request) {
        HttpHeaders requestHeaders = request.getHeaders();
        String toolAuthorisation = requestHeaders.getFirst("Tool-Authorisation");
        return Map.of(
                "Accept", "application/json",
                "Content-Type", "application/json",
                "Authorization", toolAuthorisation
        );
    }

    private Mono<ResponseEntity<String>> proxy(
            IntegratedTool tool,
            URI targetUri,
            ServerHttpRequest request,
            Map<String, String> proxyHeaders,
            String body
        ) {
        HttpClient httpClient = buildHttpClient(targetUri);
        WebClient.RequestBodySpec requestSpec = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build()
                .method(request.getMethod())
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

//        return getBody(request.getBody())
//                .flatMap(body -> {
//                    if (isNotEmpty(body)) {
//                        requestSpec.bodyValue(body);
//                    }
//                    return requestSpec
//                            .retrieve()
//                            .onStatus(this::isErrorStatusCode, this::processErrorResponse)
//                            .bodyToMono(String.class)
//                            .timeout(Duration.ofSeconds(30))
//                            .map(ResponseEntity::ok)
//                            .onErrorResume(this::buildErrorResponse)
//                            .doOnSuccess(response ->
//                                    log.info("Successfully proxied request to {}", tool.getName()))
//                            .doOnError(error ->
//                                    log.error("Failed to proxy request to {}: {}", tool.getName(), error.getMessage()));
//                });
    }

    private HttpClient buildHttpClient(URI targetUri) {
        return HttpClient.create()
                .doOnConnected(conn -> {
                    conn.channel().attr(TARGET_URI_KEY).set(targetUri);
                    conn.addHandlerFirst("curl-logger", new CurlLoggingHandler());
                });
    }

    private Mono<String> getBody(Flux<DataBuffer> dataBufferFlux) {
        return dataBufferFlux
                .map(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    return new String(bytes);
                })
                .reduce(String::concat);
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
