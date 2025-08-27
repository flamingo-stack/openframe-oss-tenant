package com.openframe.authz.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.openframe.authz.document.User;
import com.openframe.authz.keys.TenantKeyService;
import com.openframe.authz.repository.MongoRegisteredClientRepository;
import com.openframe.authz.repository.RegisteredClientMongoRepository;
import com.openframe.authz.service.UserService;
import com.openframe.authz.tenant.TenantForwardedPrefixFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.NoOpDbRefResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
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
import org.springframework.web.filter.ForwardedHeaderFilter;

import java.time.Duration;

import static com.openframe.authz.tenant.TenantContext.getTenantId;
import static java.util.UUID.randomUUID;

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
                .cors(AbstractHttpConfigurer::disable)
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

    @Bean
    public RegisteredClient gatewayClient() {
        return RegisteredClient.withId(randomUUID().toString())
            .clientId(gatewayClientId)
            .clientSecret(passwordEncoder().encode(gatewayClientSecret))
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUri(gatewayRedirectUri)
            .scope(OidcScopes.OPENID)
            .scope(OidcScopes.PROFILE)
            .scope(OidcScopes.EMAIL)
            .scope("offline_access")
            .clientSettings(ClientSettings.builder()
                .requireProofKey(true)
                .requireAuthorizationConsent(false)
                .build())
            .tokenSettings(TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofSeconds(accessTokenExpirationSeconds))
                .refreshTokenTimeToLive(Duration.ofSeconds(refreshTokenExpirationSeconds))
                .reuseRefreshTokens(false)
                .build())
            .build();
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository(
            RegisteredClientMongoRepository dataRepo,
            RegisteredClient gatewayClient) {
        MongoRegisteredClientRepository mongoRepo =
                new MongoRegisteredClientRepository(dataRepo);
        if (mongoRepo.findByClientId(gatewayClient.getClientId()) == null) {
            mongoRepo.save(gatewayClient);
        }
        return mongoRepo;
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

            String tenantId = getTenantId();
            User user = userService
                    .findActiveByEmailAndTenant(authentication.getName(), tenantId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + authentication.getName()));

            if ("access_token".equals(context.getTokenType().getValue())) {
                context.getClaims().claims(claims -> {
                    claims.put("tenant_id", tenantId);
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

    @Bean
    public MappingMongoConverter mappingMongoConverter(
            MongoDatabaseFactory factory,
            MongoCustomConversions conversions,
            MongoMappingContext context) {
        MappingMongoConverter converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, context);
        converter.setCustomConversions(conversions);
        converter.setMapKeyDotReplacement("_");
        converter.afterPropertiesSet();
        return converter;
    }
}
