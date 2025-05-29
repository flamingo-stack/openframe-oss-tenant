package com.openframe.gateway.security;

import com.openframe.gateway.security.jwt.ReactiveJwtAuthenticationFilter;
import com.openframe.security.jwt.JwtConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Flux;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties({ManagementServerProperties.class, ServerProperties.class})
@RequiredArgsConstructor
public class GatewaySecurityConfig {

    private final ManagementServerProperties managementProperties;
    private final ReactiveJwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public ReactiveJwtAuthenticationConverter reactiveJwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter rolesConverter = new JwtGrantedAuthoritiesConverter();
        rolesConverter.setAuthoritiesClaimName("roles");
        rolesConverter.setAuthorityPrefix("ROLE_");

        JwtGrantedAuthoritiesConverter scopesConverter = new JwtGrantedAuthoritiesConverter();
        scopesConverter.setAuthoritiesClaimName("scopes");
        scopesConverter.setAuthorityPrefix("SCOPE_");

        ReactiveJwtAuthenticationConverter jwtAuthenticationConverter = new ReactiveJwtAuthenticationConverter();

        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Flux<GrantedAuthority> roles = Flux.fromIterable(rolesConverter.convert(jwt));
            Flux<GrantedAuthority> scopes = Flux.fromIterable(scopesConverter.convert(jwt));
            return Flux.concat(roles, scopes);
        });

        jwtAuthenticationConverter.setPrincipalClaimName("sub");

        return jwtAuthenticationConverter;
    }

    /* TODO:
      - Have common registry of permitted path(now it's duplicated at JwtAuthenticationOperations and this class
     */
    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(
            ServerHttpSecurity http,
            @Value("${management.endpoints.web.base-path}") String managementBasePath
    ) {
        String managementContextPath = isNotBlank(managementBasePath)
                ? managementBasePath: "/actuator";

        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .addFilterAt(jwtAuthFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(reactiveJwtAuthenticationConverter()))
                )
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers(HttpMethod.OPTIONS,    "/**").permitAll()
                        .pathMatchers(
                                "/error/**",
                                "/health/**",
                                "/clients/metrics/**",
                                "/clients/oauth/token",
                                "/api/oauth/token",
                                "/api/oauth/register",
                                managementContextPath + "/**",
                                "/api/.well-known/openid-configuration"
                        ).permitAll()
                        .pathMatchers("/api/**").hasRole("USER")
                        .pathMatchers("/clients/**").hasRole("AGENT")
//                        // Agent tools
                        .pathMatchers("/tools/agent/**").hasRole("AGENT")
                        .pathMatchers("/ws/tools/agent/**").hasRole("AGENT")
//                        // Api tools
                        .pathMatchers("/tools/**").hasRole("USER")
                        .pathMatchers("/ws/tools/**").hasRole("USER")
                )
                .build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusReactiveJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }

}
