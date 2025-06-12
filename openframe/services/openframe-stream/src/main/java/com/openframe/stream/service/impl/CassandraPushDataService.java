package com.openframe.stream.service.impl;

import com.openframe.data.model.DownstreamEntity;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.DownstreamTool;
import com.openframe.stream.service.PushDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CassandraPushDataService implements PushDataService {

    private final CassandraITEventRepository repository;

    @Override
    public DownstreamTool getDownstreamToolName() {
        return DownstreamTool.CASSANDRA;
    }

    @Override
    public void pushData(DownstreamEntity downstreamEntity) {
        if (downstreamEntity instanceof CassandraITEventEntity) {
            repository.save((CassandraITEventEntity)downstreamEntity);
        }
    }
}
