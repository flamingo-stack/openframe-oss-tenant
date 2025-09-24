package com.openframe.gateway.service;

import com.openframe.core.service.ProxyUrlResolver;
import com.openframe.data.document.apikey.APIKeyType;
import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolCredentials;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.reactive.repository.tool.ReactiveIntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.config.CurlLoggingHandler;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import io.netty.util.AttributeKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import javax.net.ssl.SSLException;
import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static com.openframe.core.constants.HttpHeaders.*;
import static org.apache.commons.lang3.StringUtils.isNotBlank;
import static org.apache.commons.lang3.StringUtils.isNotEmpty;

@Service
@RequiredArgsConstructor
@Slf4j
public class RestProxyService {

    private static final AttributeKey<URI> TARGET_URI_KEY = AttributeKey.valueOf("target_uri");

    private final ReactiveIntegratedToolRepository toolRepository;
    private final ProxyUrlResolver proxyUrlResolver;
    private final ToolUrlService toolUrlService;

    public Mono<ResponseEntity<String>> proxyApiRequest(String toolId, ServerHttpRequest request, String body) {
        return toolRepository.findById(toolId)
                .flatMap(tool -> {
                    if (!tool.isEnabled()) {
                        return Mono
                                .just(ResponseEntity.badRequest().body("Tool " + tool.getName() + " is not enabled"));
                    }

                    URI originalUri = request.getURI();

                    Optional<ToolUrl> optionalToolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);
                    if (optionalToolUrl.isEmpty()) {
                        return Mono.just(ResponseEntity.badRequest().body("Tool URL not found for tool: " + toolId));
                    }
                    ToolUrl toolUrl = optionalToolUrl.get();

                    URI targetUri = proxyUrlResolver.resolve(toolId, toolUrl.getUrl(), toolUrl.getPort(), originalUri, "/tools");
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildApiRequestHeaders(tool);

                    return proxy(tool, targetUri, method, headers, body);
                })
                .switchIfEmpty(
                        Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tool not found: " + toolId)));
    }

    private Map<String, String> buildApiRequestHeaders(IntegratedTool tool) {
        Map<String, String> headers = new HashMap<>();
        headers.put(ACCEPT_CHARSET, "UTF-8");
        headers.put(ACCEPT_LANGUAGE, "en-US,en;q=0.9");
        headers.put(CONTENT_TYPE, APPLICATION_JSON);
        headers.put(ACCEPT, APPLICATION_JSON);

        ToolCredentials credentials = tool.getCredentials();
        APIKeyType apiKeyType = credentials != null
                && credentials.getApiKey() != null ? credentials.getApiKey().getType() : APIKeyType.NONE;
        switch (apiKeyType) {
            case HEADER:
                String keyName = credentials.getApiKey().getKeyName();
                String key = credentials.getApiKey().getKey();
                headers.put(keyName, key);
                break;
            case BEARER_TOKEN:
                String token = credentials.getApiKey().getKey();
                headers.put(AUTHORIZATION, "Bearer " + token);
                break;
            case NONE:
                break;
        }

        return headers;
    }

    /*
     * Currently if one device have valid open-frame machine JWT token, it can send
     * API request for other device.
     * TODO: implement device access validation after tool connection feature is
     * implemented.
     * 
     * Tactical RMM request format:
     * - GET /{agentId}/**
     * - POST /**
     * {
     * "agentId": "*",
     * }
     * }
     */
    public Mono<ResponseEntity<String>> proxyAgentRequest(String toolId, ServerHttpRequest request, String body) {
        return toolRepository.findById(toolId)
                .flatMap(tool -> {
                    if (!tool.isEnabled()) {
                        ResponseEntity<String> response = ResponseEntity.badRequest()
                                .body("Tool " + tool.getName() + " is not enabled");
                        return Mono.just(response);
                    }

                    URI originalUri = request.getURI();

                    Optional<ToolUrl> optionalToolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);
                    if (optionalToolUrl.isEmpty()) {
                        ResponseEntity<String> response = ResponseEntity.badRequest()
                                .body("Tool URL not found for tool: " + toolId);
                        return Mono.just(response);
                    }
                    ToolUrl toolUrl = optionalToolUrl.get();

                    URI targetUri = proxyUrlResolver.resolve(toolId, toolUrl.getUrl(), toolUrl.getPort(), originalUri, "/tools/agent");
                    log.debug("Proxying api request for tool: {}, url: {}", toolId, targetUri);

                    HttpMethod method = request.getMethod();
                    Map<String, String> headers = buildAgentRequestHeaders(request);

                    return proxy(tool, targetUri, method, headers, body);
                })
                .switchIfEmpty(
                        Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Tool not found: " + toolId)));
    }

    private Map<String, String> buildAgentRequestHeaders(ServerHttpRequest request) {
        Map<String, String> headers = new HashMap<>();
        headers.put(ACCEPT, APPLICATION_JSON);
        headers.put(CONTENT_TYPE, APPLICATION_JSON);

        HttpHeaders requestHeaders = request.getHeaders();
        String toolAuthorisation = requestHeaders.getFirst("Tool-Authorization");
        if (isNotBlank(toolAuthorisation)) {
            headers.put(AUTHORIZATION, toolAuthorisation);
        }
        return headers;
    }

    private Mono<ResponseEntity<String>> proxy(
            IntegratedTool tool,
            URI targetUri,
            HttpMethod method,
            Map<String, String> proxyHeaders,
            String body) {
        HttpClient httpClient = buildHttpClient(targetUri);
        
        WebClient webClient = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(16 * 1024 * 1024)) // Increase to 16MB
                .build();
                
        WebClient.RequestBodySpec requestSpec = webClient
                .method(method)
                .uri(targetUri)
                .headers(headers -> headers.setAll(proxyHeaders));

        if (isNotEmpty(body)) {
            requestSpec.bodyValue(body);
        }

        Mono<ResponseEntity<String>> monoResponseEntity;
        try {
            monoResponseEntity = requestSpec
                    .retrieve()
                    .onStatus(this::isErrorStatusCode, this::processErrorResponse)
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(60))
                    .map(ResponseEntity::ok)
                    .onErrorResume(this::buildErrorResponse)
                    .doOnSuccess(response -> log.info("Successfully proxied request to {}", tool.getName()))
                    .doOnError(error -> log.error("Failed to proxy request to {}: {}", tool.getName(),
                            error.getMessage()));
        } catch (Exception e) {
            log.error("Failed to proxy request to {}: {}", tool.getName(), e.getMessage());
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage()));
        }
        return monoResponseEntity;
    }

    private HttpClient buildHttpClient(URI targetUri) {
        return HttpClient.create()
                .responseTimeout(Duration.ofSeconds(60))
                .option(io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS, 30000)
                // Configure decoder for larger responses
                .httpResponseDecoder(spec -> spec
                        .maxHeaderSize(16384)
                        .maxInitialLineLength(16384))
                .secure(sslSpec -> {
                    try {
                        sslSpec.sslContext(io.netty.handler.ssl.SslContextBuilder.forClient()
                                .trustManager(InsecureTrustManagerFactory.INSTANCE)
                                .build());
                    } catch (SSLException e) {
                        log.error("Error configuring SSL context: {}", e.getMessage());
                    }
                })
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
                                null)));
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
