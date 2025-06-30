package com.openframe.gateway.filter;

import com.openframe.core.model.ApiKey;
import com.openframe.gateway.config.RateLimitProperties;
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

/**
 * Global filter for API key authentication on /external-api/** endpoints
 * Flow:
 * 1. Check if request is for /external-api/**
 * 2. If yes, require X-API-Key header
 * 3. Validate API key (includes total requests increment and lastUsed update)
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

        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-Key");
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("No API key provided for external API endpoint: {}", path);
            return handleUnauthorized(exchange, "API key is required for /external-api/** endpoints");
        }
        
        // Validate API key (this automatically increments totalRequests and updates lastUsed)
        return apiKeyValidationService.validateApiKey(apiKey)
            .flatMap(validationResult -> {
                if (!validationResult.isValid()) {
                    log.warn("Invalid API key for path {}: {}", path, validationResult.getErrorMessage());
                    return handleUnauthorized(exchange, validationResult.getErrorMessage());
                }
                
                ApiKey apiKeyObj = validationResult.getApiKey();
                String keyId = apiKeyObj.getKeyId();
                
                log.debug("API key validated successfully: {} for path: {}", keyId, path);
                
                // Check rate limits and get status for headers
                return rateLimitService.getRateLimitStatus(keyId)
                    .flatMap(rateLimitStatus -> {
                        log.debug("Rate limit status for {}: minute={}/{}, hour={}/{}", 
                            keyId, rateLimitStatus.getMinuteRequests(), rateLimitStatus.getMinuteLimit(),
                            rateLimitStatus.getHourRequests(), rateLimitStatus.getHourLimit());
                        
                        return rateLimitService.isAllowed(keyId)
                            .flatMap(allowed -> {
                                if (!allowed) {
                                    log.warn("Rate limit exceeded for API key: {} on path: {}", keyId, path);
                                    // Record failed request due to rate limiting
                                    apiKeyValidationService.recordFailedRequest(keyId);
                                    return handleRateLimitExceeded(exchange, rateLimitStatus);
                                }
                                
                                // Add rate limit headers using beforeCommit (proper Gateway way)
                                addRateLimitHeadersBeforeCommit(exchange, rateLimitStatus);
                                
                                // Continue to external API and record success/failure
                                return addUserContextAndContinue(exchange, chain, apiKeyObj)
                                    .doOnSuccess(unused -> {
                                        // Record successful request (includes successfulRequests increment and lastUsed update)
                                        log.debug("Request completed successfully for API key: {}", keyId);
                                        apiKeyValidationService.recordSuccessfulRequest(keyId);
                                    })
                                    .doOnError(error -> {
                                        // Record failed request due to downstream error
                                        log.warn("Request failed for API key {}: {}", keyId, error.getMessage());
                                        apiKeyValidationService.recordFailedRequest(keyId);
                                    });
                            });
                    });
            })
            .onErrorResume(error -> {
                log.error("Error in API key authentication filter: {}", error.getMessage(), error);
                return handleInternalError(exchange);
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
        // Add user context headers for external API
        var modifiedRequest = exchange.getRequest().mutate()
            .header("X-User-Id", apiKey.getUserId())
            .header("X-API-Key-Id", apiKey.getKeyId())
            // Remove original API key for security
            .headers(headers -> headers.remove("X-API-Key"))
            .build();
        
        // Modify exchange with new request
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
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        
        String responseBody = String.format(
            "{\"error\": \"Unauthorized\", \"message\": \"%s\", \"timestamp\": \"%s\"}", 
            message, 
            java.time.Instant.now()
        );
        
        var buffer = exchange.getResponse().bufferFactory().wrap(responseBody.getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
    
    /**
     * Handle rate limit exceeded
     */
    private Mono<Void> handleRateLimitExceeded(ServerWebExchange exchange, RateLimitStatus rateLimitStatus) {
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        exchange.getResponse().getHeaders().add("Retry-After", "60"); // Suggest retry after 1 minute
        
        // Add rate limit headers if enabled
        if (rateLimitProperties.isIncludeHeaders()) {
            addRateLimitHeaders(exchange, rateLimitStatus);
        }
        
        String responseBody = String.format(
            "{\"error\": \"Rate limit exceeded\", \"message\": \"Too many requests. Please try again later.\", \"timestamp\": \"%s\"}", 
            java.time.Instant.now()
        );
        
        var buffer = exchange.getResponse().bufferFactory().wrap(responseBody.getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
    
    /**
     * Add rate limit headers to response using beforeCommit (proper Gateway way)
     */
    private void addRateLimitHeadersBeforeCommit(ServerWebExchange exchange, RateLimitStatus rateLimitStatus) {
        if (!rateLimitProperties.isIncludeHeaders()) {
            log.debug("Rate limit headers disabled via configuration");
            return;
        }
        
        exchange.getResponse().beforeCommit(() -> {
            var headers = exchange.getResponse().getHeaders();
            
            // Add standard rate limit headers
            headers.add("X-RateLimit-Limit-Minute", String.valueOf(rateLimitStatus.getMinuteLimit()));
            headers.add("X-RateLimit-Remaining-Minute", String.valueOf(Math.max(0, rateLimitStatus.getMinuteLimit() - rateLimitStatus.getMinuteRequests())));
            headers.add("X-RateLimit-Limit-Hour", String.valueOf(rateLimitStatus.getHourLimit()));
            headers.add("X-RateLimit-Remaining-Hour", String.valueOf(Math.max(0, rateLimitStatus.getHourLimit() - rateLimitStatus.getHourRequests())));
            
            log.debug("Added rate limit headers for API key: {} (minute: {}/{}, hour: {}/{})", 
                rateLimitStatus.getKeyId(),
                rateLimitStatus.getMinuteRequests(), rateLimitStatus.getMinuteLimit(),
                rateLimitStatus.getHourRequests(), rateLimitStatus.getHourLimit());
            
            return Mono.empty();
        });
    }
    
    /**
     * Add rate limit headers to response (for error cases)
     */
    private void addRateLimitHeaders(ServerWebExchange exchange, RateLimitStatus rateLimitStatus) {
        if (!rateLimitProperties.isIncludeHeaders()) {
            return;
        }
        
        var headers = exchange.getResponse().getHeaders();
        
        // Add standard rate limit headers
        headers.add("X-RateLimit-Limit-Minute", String.valueOf(rateLimitStatus.getMinuteLimit()));
        headers.add("X-RateLimit-Remaining-Minute", String.valueOf(Math.max(0, rateLimitStatus.getMinuteLimit() - rateLimitStatus.getMinuteRequests())));
        headers.add("X-RateLimit-Limit-Hour", String.valueOf(rateLimitStatus.getHourLimit()));
        headers.add("X-RateLimit-Remaining-Hour", String.valueOf(Math.max(0, rateLimitStatus.getHourLimit() - rateLimitStatus.getHourRequests())));
        
        log.debug("Added rate limit headers to error response for API key: {}", rateLimitStatus.getKeyId());
    }
    
    /**
     * Handle internal server error
     */
    private Mono<Void> handleInternalError(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        
        String responseBody = String.format(
            "{\"error\": \"Internal server error\", \"message\": \"Authentication service temporarily unavailable. Please try again later.\", \"timestamp\": \"%s\"}", 
            java.time.Instant.now()
        );
        
        var buffer = exchange.getResponse().bufferFactory().wrap(responseBody.getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
} 