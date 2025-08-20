//package com.openframe.authz.config;
//
//import com.openframe.authz.dto.UserRegistrationRequest;
//import com.openframe.authz.service.RegistrationService;
//import lombok.Data;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.boot.context.properties.ConfigurationProperties;
//import org.springframework.boot.context.properties.EnableConfigurationProperties;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.core.annotation.Order;
//import org.springframework.security.config.Customizer;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.oauth2.client.registration.ClientRegistration;
//import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
//import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
//import org.springframework.security.oauth2.core.AuthorizationGrantType;
//import org.springframework.security.web.SecurityFilterChain;
//
//import java.util.Map;
//import java.util.UUID;
//
//@Configuration
//@EnableConfigurationProperties(GoogleRegistrationSecurityConfig.GoogleSsoProperties.class)
//@RequiredArgsConstructor
//@Slf4j
//public class GoogleRegistrationSecurityConfig {
//
//    private final GoogleSsoProperties googleProps;
//    private final RegistrationService registrationService;
//
//    @Bean
//    @Order(2)
//    public SecurityFilterChain googleRegisterSecurityFilterChain(HttpSecurity http,
//                                                                 ClientRegistrationRepository googleClientRepo) throws Exception {
//        http
//            .securityMatcher("/register/**")
//            .authorizeHttpRequests(reg -> reg.anyRequest().authenticated())
//            .csrf(AbstractHttpConfigurer::disable)
//            .oauth2Login(oauth -> oauth
//                .clientRegistrationRepository(googleClientRepo)
//                .successHandler((request, response, authentication) -> {
//                    try {
//                        handleGoogleRegistrationSuccess(authentication);
//                        response.sendRedirect("/central-auth-demo?registered=1");
//                    } catch (Exception e) {
//                        log.error("Google registration failed: {}", e.getMessage());
//                        response.sendRedirect("/central-auth-demo?error=registration_failed");
//                    }
//                })
//                .failureHandler((request, response, exception) -> {
//                    log.warn("Google registration OAuth failure: {}", exception.getMessage());
//                    response.sendRedirect("/central-auth-demo?error=oauth_failed");
//                })
//            )
//            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
//
//        return http.build();
//    }
//
//    @Bean
//    public ClientRegistrationRepository googleClientRepo() {
//        if (!googleProps.isEnabled()) {
//            return new InMemoryClientRegistrationRepository();
//        }
//
//        ClientRegistration registration = ClientRegistration.withRegistrationId("google")
//            .clientId(googleProps.getClientId())
//            .clientSecret(googleProps.getClientSecret())
//            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
//            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
//            .scope(googleProps.getScopes().split(","))
//            .authorizationUri(googleProps.getAuthorizationUrl())
//            .tokenUri(googleProps.getTokenUrl())
//            .userInfoUri(googleProps.getUserInfoUrl())
//            .userNameAttributeName("sub")
//            .clientName("Google (Global Registration)")
//            .build();
//
//        return new InMemoryClientRegistrationRepository(registration);
//    }
//
//    private void handleGoogleRegistrationSuccess(Authentication authentication) {
//        Map<String, Object> attributes = getStringObjectMap(authentication);
//
//        String email = valueOf(attributes.get("email"));
//        String givenName = valueOf(attributes.getOrDefault("given_name", ""));
//        String familyName = valueOf(attributes.getOrDefault("family_name", ""));
//
//        if (email == null || email.isBlank()) {
//            throw new IllegalArgumentException("Email not provided by Google");
//        }
//
//        // Build a minimal registration request (tenantDomain constrained to localhost per config)
//        UserRegistrationRequest req = new UserRegistrationRequest();
//        req.setEmail(email);
//        req.setFirstName(givenName);
//        req.setLastName(familyName);
//        req.setPassword(UUID.randomUUID().toString()); // placeholder, user uses Google
//        req.setTenantName((givenName + " " + familyName).trim().isBlank() ? email.split("@")[0] : (givenName + " " + familyName).trim());
//        req.setTenantDomain("localhost");
//
//        registrationService.registerTenant(req);
//    }
//
//    private static Map<String, Object> getStringObjectMap(Authentication authentication) {
//        Object principal = authentication.getPrincipal();
//        Map<String, Object> attributes;
//        if (principal instanceof org.springframework.security.oauth2.core.oidc.user.OidcUser oidcUser) {
//            attributes = oidcUser.getClaims();
//        } else if (principal instanceof org.springframework.security.oauth2.core.user.OAuth2User oauth2User) {
//            attributes = oauth2User.getAttributes();
//        } else {
//            throw new IllegalStateException("Unsupported principal type: " + principal.getClass().getName());
//        }
//        return attributes;
//    }
//
//    private static String valueOf(Object v) {
//        return v == null ? null : String.valueOf(v);
//    }
//
//    @Data
//    @ConfigurationProperties(prefix = "openframe.sso.google")
//    public static class GoogleSsoProperties {
//        private String clientId;
//        private String clientSecret;
//        private String authorizationUrl;
//        private String tokenUrl;
//        private String userInfoUrl;
//        private String redirectUri;
//        private String scopes = "openid,profile,email";
//        private boolean enabled = false;
//        private String displayName;
//    }
//}
//
//
