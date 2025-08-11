package com.openframe.authz.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.openframe.authz.document.User;
import com.openframe.authz.filter.TokenResponseCookieFilter;
import com.openframe.authz.service.SSOConfigService;
import com.openframe.authz.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;

import java.time.Duration;
import java.util.UUID;

import static com.openframe.authz.tenant.TenantContext.getTenantId;

/**
 * OAuth2 Authorization Server Configuration
 */
@Configuration
@EnableWebSecurity
public class AuthorizationServerConfig {

    @Value("${jwt.privateKey.value}")
    private String privateKeyPem;

    @Value("${jwt.publicKey.value}")
    private String publicKeyPem;

    @Value("${jwt.issuer:openframe}")
    private String issuer;

    @Value("${openframe.auth.client.id}")
    private String configuredClientId;

    @Value("${openframe.security.jwt.access-token-expiration:900}")
    private long accessTokenExpirationSeconds;

    @Value("${openframe.security.jwt.refresh-token-expiration:604800}")
    private long refreshTokenExpirationSeconds;

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http,
            org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource,
            TokenResponseCookieFilter tokenResponseCookieFilter) throws Exception {

        var as = new OAuth2AuthorizationServerConfigurer();
        // multi-tenant: allow multi-issuer; issuer resolved from request (Forwarded headers respected)
        AuthorizationServerSettings settings = AuthorizationServerSettings
                .builder()
                .multipleIssuersAllowed(true)
                .build();

        // Use non-deprecated API instead of http.apply(as)
        http.with(as, config -> {
            config.oidc(Customizer.withDefaults());
            config.authorizationServerSettings(settings);
        });
        var endpoints = as.getEndpointsMatcher();

        http
                .securityMatcher(endpoints)
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .csrf(csrf -> csrf.ignoringRequestMatchers(endpoints))
                .cors(c -> c.configurationSource(corsConfigurationSource))
                .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));

        return http.build();
    }

    // Register token response cookie filter at servlet layer for /oauth2/token
    @Bean
    public FilterRegistrationBean<TokenResponseCookieFilter> tokenResponseCookieFilterRegistration(
            TokenResponseCookieFilter filter) {
        FilterRegistrationBean<TokenResponseCookieFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/oauth2/token");
        return registration;
    }

    // Forwarded headers support for issuer/X-Forwarded-* behind proxies
    @Bean
    public FilterRegistrationBean<org.springframework.web.filter.ForwardedHeaderFilter> forwardedHeaderFilter() {
        var reg = new FilterRegistrationBean<>(new org.springframework.web.filter.ForwardedHeaderFilter());
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return reg;
    }

    @Bean
    public RegisteredClient openframeClient() {
        return RegisteredClient.withId(UUID.randomUUID().toString())
            .clientId(configuredClientId)
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUri("https://localhost/oauth2/callback/openframe-sso")
            .scope(OidcScopes.OPENID)
            .scope(OidcScopes.PROFILE)
            .scope(OidcScopes.EMAIL)
            .scope("offline_access")
                .clientSettings(ClientSettings.builder().requireProofKey(true).build())
            .tokenSettings(TokenSettings.builder()
                    .accessTokenTimeToLive(Duration.ofSeconds(accessTokenExpirationSeconds))
                    .refreshTokenTimeToLive(Duration.ofSeconds(refreshTokenExpirationSeconds))
                    .reuseRefreshTokens(true)
                    .build())
            .build();
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository(
            SSOConfigService ssoConfigService,
            GoogleSSOProperties googleSSOProperties,
            RegisteredClient openframeClient) {
        
        return new DatabaseRegisteredClientRepository(ssoConfigService, googleSSOProperties, openframeClient);
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(com.openframe.authz.keys.TenantKeyService tenantKeyService) {
        return (jwkSelector, securityContext) -> {
            String tenantId = getTenantId();
            if (tenantId == null || tenantId.isBlank()) {
                throw new IllegalStateException("Tenant id not resolved for JWK request");
            }
            RSAKey tenantKey = tenantKeyService.getOrCreateActiveKey(tenantId);
            return jwkSelector.select(new JWKSet(tenantKey));
        };
    }

    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    /**
     * JWT token customizer to add custom claims
     */
    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer() {
        return context -> {
            // Add tenant claims only to ID Token
            if ("id_token".equals(context.getTokenType().getValue())
                    && context.getPrincipal().getPrincipal() instanceof User user) {
                context.getClaims().claims(claims -> {
                    // Tenant claims
                    claims.put("tenant_id", user.getTenantId());
                    claims.put("tenant_domain", user.getTenantDomain());
                    // User profile claims
                    claims.put("userId", user.getId());
                    claims.put("email", user.getEmail());
                    claims.put("firstName", user.getFirstName());
                    claims.put("lastName", user.getLastName());
                    claims.put("roles", user.getRoles());
                });
            }

            // Add minimal authorization claims to Access Token for resource servers
            if ("access_token".equals(context.getTokenType().getValue())
                    && context.getPrincipal().getPrincipal() instanceof User user) {
                context.getClaims().claims(claims -> {
                    // Keep PII out; include only what API needs for authZ
                    claims.put("tenant_id", user.getTenantId());
                    claims.put("tenant_domain", user.getTenantDomain());
                    claims.put("userId", user.getId());
                    claims.put("roles", user.getRoles());
                });
            }
        };
    }

    /**
     * UserDetailsService for Spring Security authentication
     */
    @Bean
    public UserDetailsService userDetailsService(UserService userService) {
        return username -> {
            User user = userService.findByEmail(username);
            if (user == null) {
                throw new org.springframework.security.core.userdetails.UsernameNotFoundException(
                    "User not found: " + username);
            }
            
            // Convert User to UserDetails
            return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash() != null ? user.getPasswordHash() : "{noop}")
                .authorities(user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .toList())
                .accountExpired(false)
                .accountLocked(!"ACTIVE".equals(user.getStatus()))
                .credentialsExpired(false)
                .disabled(!user.isActive())
                .build();
        };
    }

    /**
     * Password encoder for secure password hashing
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * AuthenticationManager for programmatic authentication (e.g., in RegistrationController).
     * Uses our UserDetailsService and PasswordEncoder.
     */
    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
                                                       PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
