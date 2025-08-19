package com.openframe.data.repository.mongo;

import com.openframe.core.model.Machine;
import com.openframe.core.model.device.filter.MachineQueryFilter;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public interface CustomMachineRepository {
    Query buildDeviceQuery(MachineQueryFilter filter, String search);
    List<Machine> findMachinesWithCursor(Query query, String cursor, int limit);
}
