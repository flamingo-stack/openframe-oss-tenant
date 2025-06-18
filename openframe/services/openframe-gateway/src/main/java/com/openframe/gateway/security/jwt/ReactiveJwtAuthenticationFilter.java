package com.openframe.gateway.security.jwt;

import com.openframe.security.jwt.JwtService;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveJwtAuthenticationFilter implements WebFilter, JwtAuthenticationOperations {

    @Getter
    private final JwtService jwtService;
    private final ReactiveUserDetailsService userDetailsService;
    private final ReactiveUserDetailsService reactiveOAuthClientUserDetailsService;
    @Getter
    private final String managementPath;

    public ReactiveJwtAuthenticationFilter(
            JwtService jwtService,
            ReactiveUserDetailsService reactiveUserDetailsService,
            ReactiveUserDetailsService reactiveOAuthClientUserDetailsService,
            @Value("${management.endpoints.web.base-path}") String managementPath
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = reactiveUserDetailsService;
        this.reactiveOAuthClientUserDetailsService = reactiveOAuthClientUserDetailsService;
        this.managementPath = managementPath;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = getPath(exchange);
        String method = getMethod(exchange);

        if (isPermittedPath(path, method)) {
            return chain.filter(exchange);
        }

        String authHeader = getRequestAuthToken(exchange);
        logAuthAttempt(method, path, authHeader);

        String jwt = extractJwt(authHeader);
        if (jwt == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String grantType = extractGrantType(jwt);
        if ("client_credentials".equals(grantType)) {
            String clientId = extractClientId(jwt);
            if (clientId == null) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            return reactiveOAuthClientUserDetailsService.findByUsername(clientId)
                    .flatMap(userDetails -> {
                        if (validateToken(jwt, userDetails)) {
                            var authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            return chain.filter(exchange)
                                    .contextWrite(ReactiveSecurityContextHolder.withAuthentication(authentication));
                        }
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    });
        }
        if ("password".equals(grantType) || "social".equals(grantType)) {
            String userEmail = extractUsername(jwt);
            if (userEmail == null) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            return userDetailsService.findByUsername(userEmail)
                    .flatMap(userDetails -> {
                        if (validateToken(jwt, userDetails)) {
                            var authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                            return chain.filter(exchange)
                                    .contextWrite(ReactiveSecurityContextHolder.withAuthentication(authentication));
                        }
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    })
                    .onErrorResume(e -> {
                        log.error("Authentication failed: {}", e.getMessage(), e);
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    });
        }
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }
}
