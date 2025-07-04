package com.openframe.data.repository.mongo;

import com.openframe.core.model.Machine;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.query.Query;
import java.util.List;

public interface CustomMachineRepository {
    List<Machine> findMachinesWithPagination(Query query, PageRequest pageRequest);
    long countMachines(Query query);
}
