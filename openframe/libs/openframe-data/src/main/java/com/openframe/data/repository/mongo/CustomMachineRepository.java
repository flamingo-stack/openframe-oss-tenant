package com.openframe.data.repository.mongo;

import com.openframe.core.model.Machine;
import com.openframe.core.model.device.filter.MachineQueryFilter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.query.Query;
import java.util.List;

public interface CustomMachineRepository {
    List<Machine> findMachinesWithPagination(Query query, PageRequest pageRequest);
    long countMachines(Query query);
    Query buildDeviceQuery(MachineQueryFilter filter, String search);
}
