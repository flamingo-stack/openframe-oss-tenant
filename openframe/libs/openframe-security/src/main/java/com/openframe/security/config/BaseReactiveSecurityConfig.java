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
                .build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusReactiveJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }
}
