package com.openframe.security.jwt;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveJwtAuthenticationFilter implements WebFilter, JwtAuthenticationOperations {

    private final JwtService jwtService;
    private final ReactiveUserDetailsService userDetailsService;

    public ReactiveJwtAuthenticationFilter(
            JwtService jwtService,
            ReactiveUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public JwtService getJwtService() {
        return jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        
        // Skip JWT check for OPTIONS requests (CORS preflight)
        if (exchange.getRequest().getMethod().name().equals("OPTIONS")) {
            log.debug("Skipping JWT filter for OPTIONS request");
            return chain.filter(exchange);
        }

        // Skip JWT check for permitted paths
        if (isPermittedPath(path)) {
            log.debug("Skipping JWT filter for permitted path: {}", path);
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        log.info("Processing request: {} {} with auth: {}", 
            exchange.getRequest().getMethod(), 
            path,
            authHeader != null ? "Bearer token present" : "no auth");

        String jwt = extractJwt(authHeader);
        if (jwt == null) {
            log.debug("No valid auth header found, rejecting request");
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

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
                log.error("Error processing JWT token: {}", e.getMessage(), e);
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            });
    }
} 