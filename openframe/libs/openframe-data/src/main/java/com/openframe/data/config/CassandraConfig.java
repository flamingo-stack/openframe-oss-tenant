package com.openframe.data.config;

import javax.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.config.AbstractCassandraConfiguration;
import org.springframework.data.cassandra.config.CqlSessionFactoryBean;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.DefaultDriverOption;
import com.datastax.oss.driver.api.core.config.DriverConfigLoader;
import com.datastax.oss.driver.api.core.config.DriverExecutionProfile;

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

    @Override
    protected String getKeyspaceName() {
        return keyspaceName;
    }

    @Override
    protected String getLocalDataCenter() {
        return localDatacenter;
    }

    @Override
    public CqlSessionFactoryBean cassandraSession() {
        logger.info("Initializing Cassandra session with contact points: {}, datacenter: {}, keyspace: {}", 
            contactPoints, localDatacenter, keyspaceName);
            
        CqlSessionFactoryBean bean = super.cassandraSession();
        bean.setLocalDatacenter(localDatacenter);
        bean.setSessionBuilderConfigurer(builder -> {
            logger.debug("Configuring Cassandra session builder with load balancing DC: {}", localDatacenter);
            return builder.withConfigLoader(DriverConfigLoader.programmaticBuilder()
                .withString(DefaultDriverOption.LOAD_BALANCING_LOCAL_DATACENTER, localDatacenter)
                .withString(DefaultDriverOption.TIMESTAMP_GENERATOR_CLASS, 
                    "com.datastax.oss.driver.internal.core.time.ServerSideTimestampGenerator")
                .build());
        });
        return bean;
    }

    @PostConstruct
    public void logSessionDetails() {
        try {
            CqlSession session = cassandraSession().getObject();
            if (session != null) {
                DriverExecutionProfile config = session.getContext().getConfig().getDefaultProfile();
                logger.info("Cassandra Session Details:");
                logger.info("Connected Nodes: {}", session.getMetadata().getNodes());
                logger.info("Current Datacenter: {}", getLocalDataCenter());
                logger.info("Current Keyspace: {}", session.getKeyspace().orElse(null));
                logger.info("Contact Points from Config: {}", 
                    config.getStringList(DefaultDriverOption.CONTACT_POINTS));
                logger.info("Load Balancing DC: {}", 
                    config.getString(DefaultDriverOption.LOAD_BALANCING_LOCAL_DATACENTER));
            } else {
                logger.warn("Could not obtain Cassandra session for logging details");
            }
        } catch (Exception e) {
            logger.error("Error while trying to log Cassandra session details", e);
        }
    }
}