package com.openframe.gateway.filter;

import com.openframe.core.model.ApiKey;
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
 * 
 * Flow:
 * 1. Check if request is for /external-api/**
 * 2. If yes, require X-API-Key header
 * 3. Validate API key
 * 4. Check rate limits  
 * 5. Add user context headers and continue
 * 6. Update statistics asynchronously
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiKeyAuthenticationFilter implements GlobalFilter, Ordered {
    
    private final ApiKeyValidationService apiKeyValidationService;
    private final RateLimitService rateLimitService;
    
    @Override
    public int getOrder() {
        return -100; // High priority - run before other filters
    }
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        
        // Only process requests to /external-api/**
        if (!path.startsWith("/external-api/")) {
            log.debug("Path {} does not start with /external-api/, skipping API key authentication", path);
            return chain.filter(exchange);
        }
        
        log.debug("Processing /external-api/** request with API key authentication");
        
        // For /external-api/** paths, API key is required
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-Key");
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("No API key provided for /external-api/** endpoint: {}", path);
            return handleUnauthorized(exchange, "API key is required for /external-api/** endpoints");
        }
        
        // Validate API key
        return apiKeyValidationService.validateApiKey(apiKey)
            .flatMap(validationResult -> {
                if (!validationResult.isValid()) {
                    log.warn("Invalid API key for path {}: {}", path, validationResult.getErrorMessage());
                    return handleUnauthorized(exchange, validationResult.getErrorMessage());
                }
                
                ApiKey apiKeyObj = validationResult.getApiKey();
                String keyId = apiKeyObj.getKeyId();
                
                log.debug("API key validated successfully: {} for path: {}", keyId, path);
                
                // Update total requests counter asynchronously
                apiKeyValidationService.incrementTotalRequestsAsync(keyId);
                
                // Check rate limits
                return rateLimitService.isAllowed(keyId)
                    .flatMap(allowed -> {
                        if (!allowed) {
                            log.warn("Rate limit exceeded for API key: {} on path: {}", keyId, path);
                            // Increment failed requests counter
                            apiKeyValidationService.incrementFailedRequestsAsync(keyId);
                            return handleRateLimitExceeded(exchange);
                        }
                        
                        // Update last used timestamp asynchronously
                        apiKeyValidationService.updateLastUsedAsync(keyId);
                        
                        // Add user context headers and continue to external API
                        return addUserContextAndContinue(exchange, chain, apiKeyObj)
                            .doOnSuccess(unused -> {
                                // Increment successful requests counter asynchronously
                                apiKeyValidationService.incrementSuccessfulRequestsAsync(keyId);
                            })
                            .doOnError(error -> {
                                // Increment failed requests counter asynchronously  
                                apiKeyValidationService.incrementFailedRequestsAsync(keyId);
                            });
                    });
            })
            .onErrorResume(error -> {
                log.error("Error in API key authentication filter: {}", error.getMessage(), error);
                return handleInternalError(exchange);
            });
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
    private Mono<Void> handleRateLimitExceeded(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        
        String responseBody = String.format(
            "{\"error\": \"Rate limit exceeded\", \"message\": \"Too many requests\", \"timestamp\": \"%s\"}", 
            java.time.Instant.now()
        );
        
        var buffer = exchange.getResponse().bufferFactory().wrap(responseBody.getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
    
    /**
     * Handle internal server error
     */
    private Mono<Void> handleInternalError(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        
        String responseBody = String.format(
            "{\"error\": \"Internal server error\", \"message\": \"Authentication service unavailable\", \"timestamp\": \"%s\"}", 
            java.time.Instant.now()
        );
        
        var buffer = exchange.getResponse().bufferFactory().wrap(responseBody.getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
} 