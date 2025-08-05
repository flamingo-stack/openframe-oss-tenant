package com.openframe.client.service;

import com.openframe.core.model.Machine;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.data.repository.mongo.MachineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class MachineStatusService {

    private final MachineRepository machineRepository;

    // TODO: process race conditions(pessimistic lock via redis or mongo optimistic lock)
    public void updateToOnline(String machineId, Instant timestamp) {
        Machine machine = machineRepository.findByMachineId(machineId)
                .orElseThrow(() -> new IllegalStateException("Found no machine by id " + machineId));

        machine.setStatus(DeviceStatus.ONLINE);
        machine.setLastSeen(timestamp);

        machineRepository.save(machine);
    }

    public void updateToOffline(String machineId, Instant timestamp) {
        Machine machine = machineRepository.findByMachineId(machineId)
                .orElseThrow(() -> new IllegalStateException("Found no machine by id " + machineId));

        machine.setStatus(DeviceStatus.OFFLINE);
        machine.setLastSeen(timestamp);

        machineRepository.save(machine);
    }

}
