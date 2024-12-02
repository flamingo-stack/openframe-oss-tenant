package com.openframe.data.config;

import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.config.AbstractCassandraConfiguration;
import org.springframework.data.cassandra.config.CqlSessionFactoryBean;
import org.springframework.data.cassandra.config.SchemaAction;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.DefaultDriverOption;
import com.datastax.oss.driver.api.core.config.DriverConfigLoader;

@Configuration
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
@EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
public class CassandraConfig extends AbstractCassandraConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(CassandraConfig.class);

    @Value("${spring.data.cassandra.local-datacenter}")
    private String localDatacenter;

    @Value("${spring.data.cassandra.keyspace-name}")
    private String keyspaceName;

    @Value("${spring.data.cassandra.contact-points}")
    private String contactPoints;

    @Value("${spring.data.cassandra.port:9042}")
    private int port;

    @Override
    protected String getKeyspaceName() {
        return keyspaceName;
    }

    @Override
    protected String getLocalDataCenter() {
        return localDatacenter;
    }

    @Override
    protected int getPort() {
        return port;
    }

    @Override
    protected String getContactPoints() {
        return contactPoints;
    }

    @Override
    public SchemaAction getSchemaAction() {
        return SchemaAction.CREATE_IF_NOT_EXISTS;
    }

    @Override
    public CqlSessionFactoryBean cassandraSession() {
        logger.info("Initializing Cassandra session with contact points: {}, port: {}, datacenter: {}, keyspace: {}", 
            contactPoints, port, localDatacenter, keyspaceName);
            
        CqlSessionFactoryBean bean = super.cassandraSession();
        bean.setKeyspaceName(keyspaceName);
        bean.setLocalDatacenter(localDatacenter);
        bean.setSessionBuilderConfigurer(builder -> {
            logger.debug("Configuring Cassandra session builder with load balancing DC: {}", localDatacenter);
            return builder.withConfigLoader(DriverConfigLoader.programmaticBuilder()
                .withString(DefaultDriverOption.LOAD_BALANCING_LOCAL_DATACENTER, localDatacenter)
                .withStringList(DefaultDriverOption.CONTACT_POINTS, Collections.singletonList(contactPoints + ":" + port))
                .withString(DefaultDriverOption.TIMESTAMP_GENERATOR_CLASS, 
                    "com.datastax.oss.driver.internal.core.time.ServerSideTimestampGenerator")
                .build());
        });
        return bean;
    }

    @Bean
    public CassandraSessionLogger cassandraSessionLogger(CqlSession session) {
        return new CassandraSessionLogger(session);
    }
}