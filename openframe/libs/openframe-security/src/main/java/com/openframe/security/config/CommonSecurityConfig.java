package com.openframe.security.config;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.UserSecurity;
import com.openframe.security.jwt.JwtConfig;

@Configuration
public class CommonSecurityConfig {

    @Bean
    public JwtEncoder jwtEncoder(JwtConfig jwtConfig) throws Exception {
        RSAPublicKey publicKey = jwtConfig.loadPublicKey();
        RSAPrivateKey privateKey = jwtConfig.loadPrivateKey();

        RSAKey rsaKey = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .build();
        JWKSource<SecurityContext> jwks = new ImmutableJWKSet<>(new JWKSet(rsaKey));
        return new NimbusJwtEncoder(jwks);
    }

    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return username -> userRepository.findByEmail(username)
                .map(user -> new UserSecurity(user))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    
    // @ConditionalOnWebApplication(type = Type.SERVLET)
    @Bean
    public JwtDecoder jwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }

    @Bean
    @ConditionalOnWebApplication(type = Type.REACTIVE)
    public ReactiveJwtDecoder reactiveJwtDecoder(JwtConfig jwtUtils) throws Exception {
        return NimbusReactiveJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
    }

}
