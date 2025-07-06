package com.openframe.data.repository.mongo;

import com.openframe.core.model.Machine;
import com.openframe.core.model.device.filter.MachineQueryFilter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
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

    @Override
    public Query buildDeviceQuery(MachineQueryFilter filter, String search) {
        Query query = new Query();
        if (filter != null) {
            if (filter.getStatuses() != null && !filter.getStatuses().isEmpty()) {
                query.addCriteria(Criteria.where("status").in(filter.getStatuses()));
            }
            if (filter.getDeviceTypes() != null && !filter.getDeviceTypes().isEmpty()) {
                query.addCriteria(Criteria.where("type").in(filter.getDeviceTypes()));
            }
            if (filter.getOsTypes() != null && !filter.getOsTypes().isEmpty()) {
                query.addCriteria(Criteria.where("osType").in(filter.getOsTypes()));
            }
            if (filter.getOrganizationIds() != null && !filter.getOrganizationIds().isEmpty()) {
                query.addCriteria(Criteria.where("organizationId").in(filter.getOrganizationIds()));
            }
        }
        applySearchCriteria(query, search);
        return query;
    }

    private void applySearchCriteria(Query query, String search) {
        if (search != null && !search.isEmpty()) {
            Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("hostname").regex(search, "i"),
                    Criteria.where("displayName").regex(search, "i"),
                    Criteria.where("ip").regex(search, "i"),
                    Criteria.where("serialNumber").regex(search, "i"),
                    Criteria.where("manufacturer").regex(search, "i"),
                    Criteria.where("model").regex(search, "i")
            );
            query.addCriteria(searchCriteria);
        }
    }
}
