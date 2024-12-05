package com.openframe.data.repository.fleet;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.fleet.Device;
import com.openframe.core.model.fleet.DeviceType;

public interface DeviceRepository extends MongoRepository<Device, String> {
    Optional<Device> findByMachineId(String machineId);
    List<Device> findByStatus(String status);
    List<Device> findByType(DeviceType type);
} 