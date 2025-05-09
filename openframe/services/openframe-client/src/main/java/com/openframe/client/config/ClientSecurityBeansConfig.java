package com.openframe.client.config;

import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.security.oauth.OAuthClientSecurity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class ClientSecurityBeansConfig {

    @Bean
    public UserDetailsService oauthClientUserDetailsService(OAuthClientRepository oAuthClientRepository) {
        return clientId -> oAuthClientRepository.findByClientId(clientId)
                .map(OAuthClientSecurity::new)
                .orElseThrow(() -> new UsernameNotFoundException("OAuth client not found"));
    }

    @Bean
    public UserDetailsService userDetailsService() {
        // Disable user login
        return username -> {
            throw new UsernameNotFoundException("User login not supported in openframe-client");
        };
    }

    @Bean
    public AuthenticationProvider authenticationProvider(UserDetailsService oauthClientUserDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(oauthClientUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}