package com.openframe.config;

import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.config.server.environment.JGitEnvironmentProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GitConfig {
    
    @Value("${GIT_USERNAME:michaelassraf}")
    private String username;
    
    @Value("${GIT_PASSWORD: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}")
    private String password;
    
    @Bean
    public JGitEnvironmentProperties gitProperties() {
        JGitEnvironmentProperties properties = new JGitEnvironmentProperties();
        properties.setUsername(username);
        properties.setPassword(password);
        return properties;
    }
    
    @Bean
    public UsernamePasswordCredentialsProvider credentialsProvider() {
        return new UsernamePasswordCredentialsProvider(username, password);
    }
} 