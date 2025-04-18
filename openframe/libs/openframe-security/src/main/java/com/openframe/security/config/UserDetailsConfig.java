package com.openframe.security.config;

import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.security.oauth.OAuthClientSecurity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.UserSecurity;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class UserDetailsConfig {

    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return username -> userRepository.findByEmail(username)
                .map(UserSecurity::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Bean
    public UserDetailsService oauthClientUserDetailsService(OAuthClientRepository oAuthClientRepository) {
        return clientId -> oAuthClientRepository.findByClientId(clientId)
                .map(OAuthClientSecurity::new)
                .orElseThrow(() -> new UsernameNotFoundException("OAuth client not found"));
    }
} 