package com.openframe.data.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.config.AbstractCassandraConfiguration;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;
import org.springframework.beans.factory.annotation.Value;

@Configuration
@EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
public class CassandraConfig extends AbstractCassandraConfiguration {

    @Value("${spring.data.cassandra.keyspace-name}")
    private String keyspace;

    @Value("${spring.data.cassandra.contact-points}")
    private String contactPoints;

    @Override
    protected String getKeyspaceName() {
        return keyspace;
    }

    @Override
    protected String getContactPoints() {
        return contactPoints;
    }
}

