package com.openframe.data.repository.mongo;

import com.openframe.core.model.Machine;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import java.util.List;

public class CustomMachineRepositoryImpl implements CustomMachineRepository {

    private final MongoTemplate mongoTemplate;

    public CustomMachineRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Machine> findMachinesWithPagination(Query query, PageRequest pageRequest) {
        query.with(pageRequest);
        return mongoTemplate.find(query, Machine.class);
    }

    @Override
    public long countMachines(Query query) {
        return mongoTemplate.count(query, Machine.class);
    }
}
