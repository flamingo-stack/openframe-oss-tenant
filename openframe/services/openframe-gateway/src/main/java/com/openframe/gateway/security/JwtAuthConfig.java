package com.openframe.gateway.security;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import com.openframe.security.jwt.JwtConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtIssuerReactiveAuthenticationManagerResolver;
import org.springframework.security.oauth2.server.resource.authentication.JwtReactiveAuthenticationManager;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoders;
import reactor.core.publisher.Mono;

import java.time.Duration;


@Configuration
public class JwtAuthConfig {

    @Value("${openframe.security.jwt.cache.expire-after}")
    private Duration expireAfter;

    @Value("${openframe.security.jwt.cache.refresh-after}")
    private Duration refreshAfter;

    @Value("${openframe.security.jwt.cache.maximum-size}")
    private long maximumSize;

    @Bean
    public LoadingCache<String, ReactiveAuthenticationManager> issuerManagersCache(
            ReactiveJwtAuthenticationConverter converter,
            JwtConfig jwtConfig) {

        return Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(expireAfter)
                .refreshAfterWrite(refreshAfter)
                .build(issuer -> {
                    if (issuer.equals(jwtConfig.getIssuer())) {
                        var pub = jwtConfig.loadPublicKey();
                        var dec = NimbusReactiveJwtDecoder.withPublicKey(pub).build();
                        dec.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
                        var m = new JwtReactiveAuthenticationManager(dec);
                        m.setJwtAuthenticationConverter(converter);
                        return m;
                    }

                    var dec = ReactiveJwtDecoders.fromIssuerLocation(issuer);
                    var m = new JwtReactiveAuthenticationManager(dec);
                    m.setJwtAuthenticationConverter(converter);
                    return m;
                });
    }

    @Bean
    public JwtIssuerReactiveAuthenticationManagerResolver jwtIssuerAuthenticationManagerResolver(
            LoadingCache<String, ReactiveAuthenticationManager> issuerManagersCache) {
        return new JwtIssuerReactiveAuthenticationManagerResolver(issuer ->
                Mono.fromCallable(() -> issuerManagersCache.get(issuer))
        );
    }
}


