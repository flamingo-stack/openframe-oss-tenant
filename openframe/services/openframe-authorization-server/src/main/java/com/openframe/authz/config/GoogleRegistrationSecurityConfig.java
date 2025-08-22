package com.openframe.authz.config;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.web.SecurityFilterChain;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Configuration
@EnableConfigurationProperties(GoogleRegistrationSecurityConfig.GoogleSsoProperties.class)
@RequiredArgsConstructor
@Slf4j
public class GoogleRegistrationSecurityConfig {

    private final GoogleSsoProperties googleProps;

    @Bean
    @Order(2)
    public SecurityFilterChain googleRegisterSecurityFilterChain(HttpSecurity http,
                                                                 ClientRegistrationRepository googleClientRepo) throws Exception {
        http
            .securityMatcher("/register/**")
            .authorizeHttpRequests(reg -> reg.anyRequest().authenticated())
            .csrf(AbstractHttpConfigurer::disable)
            .oauth2Login(oauth -> oauth
                .clientRegistrationRepository(googleClientRepo)
                .authorizationEndpoint(a -> a.baseUri("/register/oauth2/authorization"))
                .redirectionEndpoint(r -> r.baseUri("/register/login/oauth2/code/*"))
                .successHandler((request, response, authentication) -> {
                    try {
                        Map<String, Object> attrs = extractAttributes(authentication);
                        String email = val(attrs.get("email"));
                        String given = val(attrs.get("given_name"));
                        String family = val(attrs.get("family_name"));
                        String q = "?google=1" +
                                (email != null ? "&email=" + enc(email) : "") +
                                (given != null ? "&firstName=" + enc(given) : "") +
                                (family != null ? "&lastName=" + enc(family) : "");
                        var session = request.getSession(false);
                        if (session != null) {
                            session.invalidate();
                        }
                        response.sendRedirect("/central-auth-demo" + q);
                    } catch (Exception e) {
                        log.warn("Google registration success handler failed: {}", e.getMessage());
                        response.sendRedirect("/central-auth-demo?error=oauth_failed");
                    }
                })
                .failureHandler((request, response, exception) -> {
                String raw = exception != null ? String.valueOf(exception.getMessage()) : null;
                    String safe = raw == null ? null : raw.replaceAll("[\r\n]", " ").trim();
                    if (safe != null && safe.length() > 200) {
                        safe = safe.substring(0, 200);
                    }
                    log.warn("Google registration OAuth failure: {}", safe);
                    String q = safe != null && !safe.isBlank() ? ("?error=oauth_failed&message=" + enc(safe)) : "?error=oauth_failed";
                    var session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    response.sendRedirect("/central-auth-demo" + q);
                })
            )
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));

        return http.build();
    }

    @Bean
    public ClientRegistrationRepository googleClientRepo() {
        if (!googleProps.isEnabled()) {
            return new InMemoryClientRegistrationRepository();
        }

        ClientRegistration registration = ClientRegistration.withRegistrationId("google")
            .clientId(googleProps.getClientId())
            .clientSecret(googleProps.getClientSecret())
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri(googleProps.getRedirectUri())
            .scope(googleProps.getScopes().split(","))
            .authorizationUri(googleProps.getAuthorizationUrl())
            .tokenUri(googleProps.getTokenUrl())
            .userInfoUri(googleProps.getUserInfoUrl())
            .issuerUri(resolveIssuerUri(googleProps))
            .jwkSetUri(resolveJwkSetUri(googleProps))
            .userNameAttributeName("sub")
            .clientName("Google (Registration)")
            .build();

        return new InMemoryClientRegistrationRepository(registration);
    }

    private static Map<String, Object> extractAttributes(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof org.springframework.security.oauth2.core.oidc.user.OidcUser oidc) {
            return oidc.getClaims();
        }
        if (principal instanceof org.springframework.security.oauth2.core.user.OAuth2User u) {
            return u.getAttributes();
        }
        throw new IllegalStateException("Unsupported principal: " + principal.getClass().getName());
    }

    private static String val(Object o) { return o == null ? null : String.valueOf(o); }
    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }

    @Data
    @ConfigurationProperties(prefix = "openframe.sso.google")
    public static class GoogleSsoProperties {
        private String clientId;
        private String clientSecret;
        private String authorizationUrl;
        private String tokenUrl;
        private String userInfoUrl;
        private String scopes;
        private boolean enabled;
        private String displayName;
        private String redirectUri;
        private String issuerUri;
        private String jwkSetUri;
    }

    private static String resolveIssuerUri(GoogleSsoProperties props) {
        if (props.getIssuerUri() != null && !props.getIssuerUri().isBlank()) {
            return props.getIssuerUri();
        }
        // Default Google issuer
        return "https://accounts.google.com";
    }

    private static String resolveJwkSetUri(GoogleSsoProperties props) {
        if (props.getJwkSetUri() != null && !props.getJwkSetUri().isBlank()) {
            return props.getJwkSetUri();
        }
        // Default Google JWKs endpoint (ok to provide alongside issuer)
        return "https://www.googleapis.com/oauth2/v3/certs";
    }
}


