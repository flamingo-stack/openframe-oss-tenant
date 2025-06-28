package com.openframe.gateway.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("apiKeyStatsExecutor")
    public Executor apiKeyStatsExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("api-key-stats-");
        executor.setRejectedExecutionHandler((r, executor1) -> {
            log.warn("API key stats update task rejected - queue is full");
        });
        executor.initialize();
        return executor;
    }
} 