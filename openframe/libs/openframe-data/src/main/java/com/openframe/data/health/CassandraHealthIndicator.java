package com.openframe.data.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.cassandra.core.CassandraOperations;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = true)
public class CassandraHealthIndicator implements HealthIndicator {

    private final CassandraOperations cassandraOperations;

    public CassandraHealthIndicator(CassandraOperations cassandraOperations) {
        this.cassandraOperations = cassandraOperations;
    }

    @Override
    public Health health() {
        try {
            cassandraOperations.getCqlOperations()
                .queryForObject("SELECT release_version FROM system.local", String.class);
            return Health.up().build();
        } catch (Exception e) {
            return Health.down().withException(e).build();
        }
    }
}
