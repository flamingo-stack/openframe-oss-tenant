package com.openframe.client.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Configuration for NATS message processing thread pool.
 * Provides a dedicated TaskExecutor for handling NATS JetStream messages.
 */
@Configuration
public class NatsExecutorConfig {
    
    /**
     * Creates a TaskExecutor specifically for NATS message processing.
     * Configured with graceful shutdown to ensure messages are properly handled during application stop.
     *
     * @return configured TaskExecutor instance
     */
    @Bean(name = "natsMessageExecutor")
    public TaskExecutor natsMessageExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("nats-msg-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}

