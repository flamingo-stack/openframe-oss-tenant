package com.openframe.data.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
@EnableMongoRepositories(basePackages = "com.openframe.data.repository.mongo")
@ConditionalOnProperty(name = "spring.data.mongo.enabled", havingValue = "true", matchIfMissing = false)
public class MongoConfig {
}