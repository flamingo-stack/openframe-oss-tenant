package com.openframe.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.core.dto.ErrorResponse;
import com.openframe.data.document.apikey.ApiKey;
import com.openframe.gateway.config.prop.RateLimitProperties;
import com.openframe.gateway.model.RateLimitStatus;
import com.openframe.gateway.service.ApiKeyValidationService;
import com.openframe.gateway.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static com.openframe.core.constants.HttpHeaders.*;
import static org.springframework.http.HttpStatus.*;

/**
 * Global filter for API key authentication on /external-api/** endpoints
 * Flow:
 * 1. Check if request is for /external-api/**
 * 2. If yes, require X-API-Key header
 * 3. Validate API key (includes total requests increment)
 * 4. Check rate limits  
 * 5. Add user context headers and continue
 * 6. Record success/failure statistics
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiKeyAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String EXTERNAL_API_PREFIX = "/external-api/";
    private static final String API_DOCS_PATH = "/api-docs";
    private static final String SWAGGER_UI_PATH = "/swagger-ui";
    private static final String SWAGGER_UI_HTML = "/swagger-ui.html";
    private static final String WEBJARS_PATH = "/webjars";
    
    private final ApiKeyValidationService apiKeyValidationService;
    private final RateLimitService rateLimitService;
    private final RateLimitProperties rateLimitProperties;
    private final ObjectMapper objectMapper;
    
    @Override
    public int getOrder() {
        return -100;
    }
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        
        log.debug("Processing request path: {}", path);

        if (isDirectSwaggerPath(path)) {
            log.debug("Skipping API key authentication for Swagger path: {}", path);
            return chain.filter(exchange);
        }

        if (!path.startsWith(EXTERNAL_API_PREFIX)) {
            log.debug("Path {} is not external API, skipping authentication", path);
            return chain.filter(exchange);
        }

        log.debug("Processing external API request with API key authentication: {}", path);

        String apiKey = exchange.getRequest().getHeaders().getFirst(X_API_KEY);
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("No API key provided for external API endpoint: {}", path);
            return handleUnauthorized(exchange, "API key is required for /external-api/** endpoints");
        }
        
        return apiKeyValidationService.validateApiKey(apiKey)
                .flatMap(validationResult -> processValidationResult(validationResult, exchange, chain, path))
                .onErrorResume(error -> {
                    log.error("Error in API key authentication filter: {}", error.getMessage(), error);
                    return handleInternalError(exchange);
                });
    }

    /**
     * Process API key validation result
     */
    private Mono<Void> processValidationResult(ApiKeyValidationService.ApiKeyValidationResult validationResult,
                                               ServerWebExchange exchange, GatewayFilterChain chain, String path) {
        if (!validationResult.isValid()) {
            log.warn("Invalid API key for path {}: {}", path, validationResult.getErrorMessage());
            return handleUnauthorized(exchange, validationResult.getErrorMessage());
        }

        ApiKey apiKeyObj = validationResult.getApiKey();
        String keyId = apiKeyObj.getKeyId();

        log.debug("API key validated successfully: {} for path: {}", keyId, path);

        return rateLimitService.isAllowed(keyId)
                .flatMap(allowed -> processRateLimitCheck(allowed, keyId, exchange, chain, apiKeyObj, path));
    }

    /**
     * Process rate limit check result
     */
    private Mono<Void> processRateLimitCheck(Boolean allowed, String keyId, ServerWebExchange exchange,
                                             GatewayFilterChain chain, ApiKey apiKeyObj, String path) {
        if (!allowed) {
            return processRateLimitExceeded(keyId, exchange, path);
        }

        return processAllowedRequest(keyId, exchange, chain, apiKeyObj);
    }

    /**
     * Process rate limit exceeded scenario
     */
    private Mono<Void> processRateLimitExceeded(String keyId, ServerWebExchange exchange, String path) {
        return rateLimitService.getRateLimitStatus(keyId)
                .flatMap(rateLimitStatus -> {
                    log.warn("Rate limit exceeded for API key: {} on path: {}", keyId, path);
                    apiKeyValidationService.recordFailedRequest(keyId);
                    return handleRateLimitExceeded(exchange, rateLimitStatus);
                });
    }

    /**
     * Process allowed request with rate limit headers
     */
    private Mono<Void> processAllowedRequest(String keyId, ServerWebExchange exchange,
                                             GatewayFilterChain chain, ApiKey apiKeyObj) {
        return rateLimitService.getRateLimitStatus(keyId)
                .flatMap(rateLimitStatus -> {
                    log.debug("Rate limit status for {}: minute={}/{}, hour={}/{}, day={}/{}",
                            keyId, rateLimitStatus.minuteRequests(), rateLimitStatus.minuteLimit(),
                            rateLimitStatus.hourRequests(), rateLimitStatus.hourLimit(),
                            rateLimitStatus.dayRequests(), rateLimitStatus.dayLimit());

                    addRateLimitHeaders(exchange, rateLimitStatus);

                    return addUserContextAndContinue(exchange, chain, apiKeyObj)
                            .doOnSuccess(unused -> {
                                log.debug("Request completed successfully for API key: {}", keyId);
                                apiKeyValidationService.recordSuccessfulRequest(keyId);
                            })
                            .doOnError(error -> {
                                log.warn("Request failed for API key {}: {}", keyId, error.getMessage());
                                apiKeyValidationService.recordFailedRequest(keyId);
                            });
            });
    }
    
    /**
     * Check if path is a direct Swagger/OpenAPI path (outside external-api)
     */
    private boolean isDirectSwaggerPath(String path) {
        return path.startsWith(API_DOCS_PATH) ||
               path.startsWith(SWAGGER_UI_PATH) ||
               path.equals(SWAGGER_UI_HTML) ||
               path.startsWith(WEBJARS_PATH);
    }

    /**
     * Add user context headers and continue to external API
     */
    private Mono<Void> addUserContextAndContinue(ServerWebExchange exchange, GatewayFilterChain chain, ApiKey apiKey) {

        var modifiedRequest = exchange.getRequest().mutate()
            .header(X_API_KEY_ID, apiKey.getKeyId())
            .header(X_USER_ID, apiKey.getUserId())
            .headers(headers -> headers.remove(X_API_KEY))
            .build();
        
        var modifiedExchange = exchange.mutate()
            .request(modifiedRequest)
            .build();
        
        log.debug("Added user context headers for user: {} and continuing to external API", apiKey.getUserId());
        
        return chain.filter(modifiedExchange);
    }

    /**
     * Handle unauthorized access
     */
    private Mono<Void> handleUnauthorized(ServerWebExchange exchange, String message) {
        return writeErrorResponse(exchange, UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    /**
     * Write error response in a reactive way
     *
     * Note: We cannot use exceptions like BadCredentialsException here because
     * Spring WebFlux filters execute at a lower level than controllers,
     * so @ControllerAdvice/@ExceptionHandler won't catch them.
     * Instead, we handle errors directly in the filter.
     */
    private Mono<Void> writeErrorResponse(ServerWebExchange exchange, HttpStatus status, String code, String message) {
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().add(CONTENT_TYPE, APPLICATION_JSON);

        return Mono.fromCallable(() -> {
                    ErrorResponse errorResponse = new ErrorResponse(code, message);
                    return objectMapper.writeValueAsString(errorResponse);
                })
                .onErrorReturn("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}")
                .map(responseBody -> exchange.getResponse().bufferFactory().wrap(responseBody.getBytes()))
                .flatMap(buffer -> exchange.getResponse().writeWith(Mono.just(buffer)));
    }

    /**
     * Handle rate limit exceeded
     */
    private Mono<Void> handleRateLimitExceeded(ServerWebExchange exchange, RateLimitStatus rateLimitStatus) {
        exchange.getResponse().getHeaders().add("Retry-After", "60");
        addRateLimitHeaders(exchange, rateLimitStatus);
        
        return writeErrorResponse(exchange, TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.");
    }
    
    /**
     * Add rate limiting headers to response
     */
    private void addRateLimitHeaders(ServerWebExchange exchange, RateLimitStatus rateLimitStatus) {
        if (!rateLimitProperties.isIncludeHeaders()) {
            return;
        }

        exchange.getResponse().beforeCommit(() -> {
            addHeadersToResponse(exchange.getResponse().getHeaders(), rateLimitStatus);
            return Mono.empty();
        });
    }
    
    /**
     * Add rate limit headers to response
     * 
     * Rate limiting headers for minute, hour, and day limits.
     * Follows standard HTTP rate limiting header conventions.
     * 
     * @param headers Response headers to add to
     * @param rateLimitStatus Current rate limit status
     */
    private void addHeadersToResponse(org.springframework.http.HttpHeaders headers, RateLimitStatus rateLimitStatus) {
        headers.add(X_RATE_LIMIT_LIMIT_MINUTE, String.valueOf(rateLimitStatus.minuteLimit()));
        headers.add(X_RATE_LIMIT_REMAINING_MINUTE, String.valueOf(Math.max(0, rateLimitStatus.minuteLimit() - rateLimitStatus.minuteRequests())));
        headers.add(X_RATE_LIMIT_LIMIT_HOUR, String.valueOf(rateLimitStatus.hourLimit()));
        headers.add(X_RATE_LIMIT_REMAINING_HOUR, String.valueOf(Math.max(0, rateLimitStatus.hourLimit() - rateLimitStatus.hourRequests())));
        headers.add(X_RATE_LIMIT_LIMIT_DAY, String.valueOf(rateLimitStatus.dayLimit()));
        headers.add(X_RATE_LIMIT_REMAINING_DAY, String.valueOf(Math.max(0, rateLimitStatus.dayLimit() - rateLimitStatus.dayRequests())));
    }
    
    /**
     * Handle internal server error
     */
    private Mono<Void> handleInternalError(ServerWebExchange exchange) {
        return writeErrorResponse(exchange, INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
    }
} 