package com.openframe.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.MvcRequestMatcher;
import org.springframework.web.servlet.handler.HandlerMappingIntrospector;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${management.server.base-path:/management}")
    private String managementBasePath;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http, 
            HandlerMappingIntrospector introspector) throws Exception {
        
        MvcRequestMatcher.Builder mvcMatcherBuilder = new MvcRequestMatcher.Builder(introspector);
        
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers(mvcMatcherBuilder.pattern("/graphql")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/graphiql/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/ws/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern("/v1/**")).permitAll()
                .requestMatchers(mvcMatcherBuilder.pattern(managementBasePath + "/**")).permitAll()
                .anyRequest().authenticated()
            );

        http.csrf(csrf -> csrf.disable());
        http.cors(cors -> cors.disable());

        return http.build();
    }
}
