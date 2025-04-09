package com.openframe.data.config;

import javax.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.DefaultDriverOption;
import com.datastax.oss.driver.api.core.config.DriverExecutionProfile;

public class CassandraSessionLogger {
    private static final Logger logger = LoggerFactory.getLogger(CassandraSessionLogger.class);
    
    private final CqlSession session;
    
    public CassandraSessionLogger(CqlSession session) {
        this.session = session;
    }
    
    @PostConstruct
    public void logSessionDetails() {
        try {
            if (session != null) {
                DriverExecutionProfile config = session.getContext().getConfig().getDefaultProfile();
                logger.info("Cassandra Session Details:");
                logger.info("Connected Nodes: {}", session.getMetadata().getNodes());
                logger.info("Current Datacenter: {}", session.getMetadata().getNodes().values().stream()
                    .findFirst()
                    .map(node -> node.getDatacenter())
                    .orElse("unknown"));
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