// services/openframe-data/src/main/java/com/openframe/data/config/CassandraConfig.java
package com.openframe.data.config;

import org.springframework.boot.autoconfigure.cassandra.CassandraAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;

@Configuration
@EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
@Import(CassandraAutoConfiguration.class)
public class CassandraConfig {
    // Spring Boot autoconfiguration will handle the setup based on application.yml properties
}