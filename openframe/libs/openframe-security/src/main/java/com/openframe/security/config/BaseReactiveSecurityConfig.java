package com.openframe.security.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;

import reactor.core.publisher.Mono;

@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties({ManagementServerProperties.class, ServerProperties.class})
public abstract class BaseReactiveSecurityConfig {

    private final ManagementServerProperties managementProperties;
    private final ServerProperties serverProperties;

    protected BaseReactiveSecurityConfig(
            ManagementServerProperties managementProperties,
            ServerProperties serverProperties) {
        this.managementProperties = managementProperties;
        this.serverProperties = serverProperties;
    }


    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        String managementContextPath = managementProperties.getBasePath() != null
                ? managementProperties.getBasePath() : "/actuator";

        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                .pathMatchers(
                        "/health/**",
                        "/metrics/**",
                        managementContextPath + "/**"
                ).permitAll()
                .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(token
                -> Mono.just(new JwtAuthenticationToken(token))
        ))
                )
                .build();
    }
}
