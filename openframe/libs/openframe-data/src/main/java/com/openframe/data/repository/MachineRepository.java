package com.openframe.data.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.openframe.core.model.Machine;
import java.util.Optional;

public interface MachineRepository extends MongoRepository<Machine, String> {
    Optional<Machine> findByMachineId(String machineId);
} 