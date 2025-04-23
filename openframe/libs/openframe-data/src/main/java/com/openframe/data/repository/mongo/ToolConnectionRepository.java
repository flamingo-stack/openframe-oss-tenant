package com.openframe.data.repository.mongo;

import com.openframe.core.model.ToolConnection;
import com.openframe.core.model.ToolType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ToolConnectionRepository extends MongoRepository<ToolConnection, String> {
    List<ToolConnection> findByMachineId(String machineId);
    Optional<ToolConnection> findByMachineIdAndToolType(String machineId, ToolType toolType);
}
