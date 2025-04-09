package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.Machine;

@Repository
public interface MachineRepository extends MongoRepository<Machine, String> {
    Optional<Machine> findByMachineId(String machineId);
} 