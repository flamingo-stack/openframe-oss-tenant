package com.openframe.security.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;

import com.openframe.security.jwt.JwtConfig;
import com.openframe.security.jwt.ReactiveJwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties({ManagementServerProperties.class, ServerProperties.class})
@RequiredArgsConstructor
public abstract class BaseReactiveSecurityConfig {

    private final ManagementServerProperties managementProperties;
    private final ServerProperties serverProperties;
    private final ReactiveJwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        String managementContextPath = managementProperties.getBasePath() != null
                ? managementProperties.getBasePath() : "/actuator";

        return http
                // .cors(cors -> cors.configurationSource(request -> {
                //     CorsConfiguration corsConfig = new CorsConfiguration();
                //     corsConfig.setAllowedOrigins(Arrays.asList(
                //         "http://localhost",
                //         "http://localhost:5173",
                //         "http://localhost:5174"
                //     ));
                //     corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                //     corsConfig.setAllowedHeaders(Arrays.asList(
                //         "Authorization", 
                //         "Content-Type", 
                //         "x-requested-with",
                //         "Access-Control-Allow-Origin",
                //         "Access-Control-Allow-Credentials",
                //         "Access-Control-Allow-Headers",
                //         "Access-Control-Allow-Methods",
                //         "Access-Control-Expose-Headers",
                //         "Access-Control-Max-Age"
                //     ));
                //     corsConfig.setExposedHeaders(Arrays.asList(
                //         "Authorization", 
                //         "Content-Type",
                //         "Access-Control-Allow-Origin",
                //         "Access-Control-Allow-Credentials"
                //     ));
                //     corsConfig.setAllowCredentials(true);
                //     corsConfig.setMaxAge(3600L);
                //     return corsConfig;
                // }))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .addFilterAt(jwtAuthFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(token
                        -> Mono.just(new JwtAuthenticationToken(token))
                    ))
                )
                .authorizeExchange(exchanges -> exchanges
                    .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .pathMatchers(
                            "/error/**",
                            "/health/**",
                            "/metrics/**",
                            "/oauth/token",
                            "/oauth/register",
                            managementContextPath + "/**"
                    ).permitAll()
                    .pathMatchers("/.well-known/userinfo").authenticated()
                    .pathMatchers("/.well-known/openid-configuration").permitAll()
                    .anyExchange().authenticated()
                )
                // .exceptionHandling(handler -> handler
                //     .authenticationEntryPoint((exchange, ex) -> {
                //         String origin = exchange.getRequest().getHeaders().getFirst("Origin");
                //         if (origin != null) {
                //             exchange.getResponse().getHeaders().add("Access-Control-Allow-Origin", origin);
                //             exchange.getResponse().getHeaders().add("Access-Control-Allow-Credentials", "true");
                //             exchange.getResponse().getHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                //             exchange.getResponse().getHeaders().add("Access-Control-Allow-Headers", 
                //                 "Authorization, Content-Type, x-requested-with");
                //             exchange.getResponse().getHeaders().add("Access-Control-Max-Age", "3600");
                //             exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                //         }
                //         return Mono.fromRunnable(() -> {
                //             exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                //         });
                //     })
                // )
                .build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusReactiveJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }
}
