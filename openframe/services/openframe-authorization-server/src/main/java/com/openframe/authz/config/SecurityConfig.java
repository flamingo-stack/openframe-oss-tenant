package com.openframe.authz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;

import java.util.HashSet;
import java.util.Set;

/**
 * Security Configuration for Default Requests
 * This handles all non-Authorization Server requests
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    public static final String EMAIL = "email";
    public static final String SUB = "sub";

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http,
                                                          OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/oauth/**",           // OAuth endpoints
                    "/oauth2/**",          // Social OAuth endpoints
                    "/login",              // Login page
                    "/favicon.ico",        // Favicon
                    "/tenant/**",          // Tenant discovery endpoints
                    "/sso/**",             // SSO providers
                    "/management/v1/**",   // Health check
                    "/.well-known/**",     // OpenID configuration
                    "/error"               // Error handling
                ).permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.loginPage("/login").permitAll())
                .oauth2Login(o -> o
                        .loginPage("/login")
                        .userInfoEndpoint(u -> u.oidcUserService(oidcUserService))
                )
            .build();
    }

    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return userRequest -> {
            OidcUser user = delegate.loadUser(userRequest);

            Set<GrantedAuthority> authorities = new HashSet<>(user.getAuthorities());

            String nameKey = (user.getEmail() != null && !user.getEmail().isBlank()) ? EMAIL : SUB;

            OidcUserInfo userInfo = user.getUserInfo() != null
                    ? user.getUserInfo()
                    : new OidcUserInfo(user.getClaims());

            return new DefaultOidcUser(authorities, userRequest.getIdToken(), userInfo, nameKey);
        };
    }
}