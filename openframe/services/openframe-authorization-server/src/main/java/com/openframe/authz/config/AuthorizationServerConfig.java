package com.openframe.authz.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.openframe.authz.document.User;
import com.openframe.authz.keys.TenantKeyService;
import com.openframe.authz.service.UserService;
import com.openframe.authz.tenant.TenantForwardedPrefixFilter;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.filter.ForwardedHeaderFilter;

import static com.openframe.authz.tenant.TenantContext.getTenantId;

/**
 * OAuth2 Authorization Server Configuration
 */
@Configuration
@EnableWebSecurity
@Slf4j
public class AuthorizationServerConfig {

    @Value("${openframe.auth.gateway.client.id}")
    private String gatewayClientId;

    @Value("${openframe.auth.gateway.client.secret}")
    private String gatewayClientSecret;

    @Value("${openframe.auth.gateway.redirect-uri}")
    private String gatewayRedirectUri;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private long accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private long refreshTokenExpirationSeconds;

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http) throws Exception {

        var as = new OAuth2AuthorizationServerConfigurer();
        AuthorizationServerSettings settings = AuthorizationServerSettings
                .builder()
                .multipleIssuersAllowed(true)
                .build();

        http.with(as, config -> {
            config.oidc(Customizer.withDefaults());
            config.authorizationServerSettings(settings);
        });
        var endpoints = as.getEndpointsMatcher();

        return http
                .securityMatcher(endpoints)
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .csrf(csrf -> csrf.ignoringRequestMatchers(endpoints))
                .cors(cors -> cors.disable())
                .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    public FilterRegistrationBean<ForwardedHeaderFilter> forwardedHeaderFilter() {
        var reg = new FilterRegistrationBean<>(new ForwardedHeaderFilter());
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        return reg;
    }

    @Bean
    public FilterRegistrationBean<TenantForwardedPrefixFilter> tenantForwardedPrefixFilter() {
        var reg = new FilterRegistrationBean<>(new TenantForwardedPrefixFilter());
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 15);
        return reg;
    }

    // Gateway client is now managed in MongoDB via ClientMigration component

    @Bean
    public RegisteredClientRepository registeredClientRepository(
            com.openframe.data.repository.mongo.OAuthClientRepository repository,
            PasswordEncoder passwordEncoder,
            com.openframe.core.service.EncryptionService encryptionService) {
        return new com.openframe.authz.repository.MongoRegisteredClientRepository(
                repository, passwordEncoder, encryptionService);
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(TenantKeyService tenantKeyService) {
        return (jwkSelector, securityContext) -> {
            String tenantId = getTenantId();
            if (tenantId == null || tenantId.isBlank()) {
                log.error("JWKS request without resolved tenant id");
                throw new IllegalStateException("Tenant id not resolved for JWK request");
            }
            RSAKey tenantKey = tenantKeyService.getOrCreateActiveKey(tenantId);
            String kid = tenantKey.getKeyID();
            log.debug("Serving JWKS for tenantId='{}' with kid='{}'", tenantId, kid);
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
    public OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer(UserService userService) {
        return context -> {
            var authentication = context.getPrincipal();
            var authorities = authentication.getAuthorities();
            var roles = authorities.stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(a -> a != null && a.startsWith("ROLE_"))
                    .map(a -> a.substring(5))
                    .toList();


            String tenantId = getTenantId();
            User user = userService
                    .findActiveByEmailAndTenant(authentication.getName(), tenantId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + authentication.getName()));

            if ("access_token".equals(context.getTokenType().getValue())) {
                context.getClaims().claims(claims -> {
                    claims.put("tenant_id", tenantId);
                    claims.put("tenant_domain", user.getTenantDomain());
                    claims.put("userId", user.getId());
                    claims.put("roles", roles);
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
            String tenantId = getTenantId();
            User user = userService.findActiveByEmailAndTenant(username, tenantId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

            return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash() != null ? user.getPasswordHash() : "{noop}")
                .authorities(user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .toList())
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(false)
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
