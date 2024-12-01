package com.openframe.data.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.config.AbstractCassandraConfiguration;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;

@Configuration
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
@EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
public class CassandraConfig extends AbstractCassandraConfiguration {

    @Value("${spring.data.cassandra.local-datacenter}")
    private String localDatacenter;

    @Override
    protected String getKeyspaceName() {
        return "openframe";
    }

    @Override
    protected String getLocalDataCenter() {
        return localDatacenter;
    }
}