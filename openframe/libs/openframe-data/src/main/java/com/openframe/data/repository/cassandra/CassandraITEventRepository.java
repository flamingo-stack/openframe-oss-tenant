package com.openframe.data.repository.cassandra;

import com.openframe.data.model.cassandra.CassandraITEventEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
public interface CassandraITEventRepository extends CassandraRepository<CassandraITEventEntity, CassandraITEventEntity.CassandraITEventKey> {
    
}