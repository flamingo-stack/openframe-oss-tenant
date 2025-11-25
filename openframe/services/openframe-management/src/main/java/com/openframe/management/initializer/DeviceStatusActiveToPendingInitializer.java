package com.openframe.management.initializer;

import com.openframe.data.document.device.DeviceStatus;
import com.openframe.data.document.device.Machine;
import com.openframe.data.repository.device.MachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Initializer that migrates device statuses from ACTIVE to PENDING on application startup.
 * Enabled when not running in localhost profile (openframe.localhost=false), mirroring TenantHubSpotSyncInitializer.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DeviceStatusActiveToPendingInitializer {

	private final MachineRepository machineRepository;

	@PostConstruct
	public void migrateActiveToPending() {
		log.info("Starting device status migration: ACTIVE -> PENDING");

		List<Machine> activeMachines = machineRepository.findAll().stream()
				.filter(m -> m.getStatus() == DeviceStatus.ACTIVE)
				.collect(Collectors.toList());

		if (activeMachines.isEmpty()) {
			log.info("No ACTIVE devices found. Migration completed with 0 changes.");
			return;
		}

		activeMachines.forEach(machine -> {
			machine.setStatus(DeviceStatus.PENDING);
		});

		machineRepository.saveAll(activeMachines);
		log.info("Device status migration completed: {} devices updated to PENDING", activeMachines.size());
	}
}


