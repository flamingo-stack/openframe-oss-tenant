package com.openframe.gateway.security;

import com.openframe.gateway.security.filter.CookieToHeaderFilter;
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

import static com.openframe.gateway.security.SecurityConstants.*;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties({ManagementServerProperties.class, ServerProperties.class})
@RequiredArgsConstructor
public class GatewaySecurityConfig {

    private final ManagementServerProperties managementProperties;
    private final CookieToHeaderFilter cookieToHeaderFilter;

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
      - Consider extracting permitted paths configuration to a separate component for reusability
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
                .addFilterBefore(cookieToHeaderFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(reactiveJwtAuthenticationConverter()))
                )
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers(HttpMethod.OPTIONS,    "/**").permitAll()
                        .pathMatchers(
                                "/error/**",
                                "/health/**",
                                CLIENTS_PREFIX + "/metrics/**",
                                CLIENTS_PREFIX + "/api/agents/register",
                                CLIENTS_PREFIX + "/oauth/token",
                                DASHBOARD_PREFIX + "/oauth/token",
                                DASHBOARD_PREFIX + "/oauth/register",
                                DASHBOARD_PREFIX + "/oauth2/**",
                                DASHBOARD_PREFIX + "/sso/providers",
                                 managementContextPath + "/**",
                                DASHBOARD_PREFIX + "/.well-known/openid-configuration",
                                CLIENTS_PREFIX + "/tool-agent/**"
                        ).permitAll()
                                .pathMatchers(DASHBOARD_PREFIX + "/**").hasRole("USER")
                                .pathMatchers(CLIENTS_PREFIX + "/**").hasRole("AGENT")
//                        // Agent tools
                                .pathMatchers(TOOLS_PREFIX + "/agent/**").hasRole("AGENT")
                                .pathMatchers(WS_TOOLS_PREFIX + "/agent/**").hasRole("AGENT")
//                        // Api tools
                                .pathMatchers(TOOLS_PREFIX + "/**").hasRole("USER")
                                .pathMatchers(WS_TOOLS_PREFIX + "/**").hasRole("USER")
                                .pathMatchers("/**").permitAll()
                )
                .build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusReactiveJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }

}
