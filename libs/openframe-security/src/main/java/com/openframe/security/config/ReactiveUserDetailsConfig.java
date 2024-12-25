package com.openframe.security.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.openframe.data.repository.mongo.ReactiveUserRepository;
import com.openframe.security.UserSecurity;

import reactor.core.publisher.Mono;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveUserDetailsConfig {

    @Bean
    public ReactiveUserDetailsService reactiveUserDetailsService(ReactiveUserRepository reactiveUserRepository) {
        return username -> reactiveUserRepository.findByEmail(username)
                .map(user -> new UserSecurity(user))
                .cast(UserDetails.class)
                .switchIfEmpty(Mono.error(new UsernameNotFoundException("User not found")));
    }
} 