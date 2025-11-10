package com.openframe.client.service;

import com.openframe.client.exception.InvalidAgentIdException;
import com.openframe.client.exception.MachineNotFoundException;
import com.openframe.data.document.installedagents.InstalledAgent;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.installedagents.InstalledAgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class InstalledAgentService {

    private final InstalledAgentRepository installedAgentRepository;
    private final MachineRepository machineRepository;

    @Transactional
    public void addInstalledAgent(String machineId, String agentType, String version, boolean lastAttempt) {
        validateMachineId(machineId);
        validateAgentType(agentType);
        validateMachineExists(machineId);

        log.info("Installed agent processing: machineId={}, agentType={}, version={}", machineId, agentType, version);

        installedAgentRepository
                .findByMachineIdAndAgentType(machineId, agentType)
                .ifPresentOrElse(
                        installedAgent -> updateExistingInstalledAgent(installedAgent, version, machineId, agentType),
                        () -> addNewInstalledAgent(machineId, agentType, version)
                );
    }

    private void updateExistingInstalledAgent(
            InstalledAgent installedAgent,
            String version,
            String machineId,
            String agentType
    ) {
        installedAgent.setVersion(version);
        installedAgent.setUpdatedAt(Instant.now().toString());
        installedAgentRepository.save(installedAgent);

        log.info("Updated existing installed agent: machineId={} agentType={} version={}", 
                machineId, agentType, version);
    }

    private void addNewInstalledAgent(String machineId, String agentType, String version) {
        InstalledAgent installedAgent = new InstalledAgent();
        installedAgent.setMachineId(machineId);
        installedAgent.setAgentType(agentType);
        installedAgent.setVersion(version);
        
        String now = Instant.now().toString();
        installedAgent.setCreatedAt(now);
        installedAgent.setUpdatedAt(now);
        
        installedAgentRepository.save(installedAgent);

        log.info("Saved new installed agent: machineId={} agentType={} version={}", 
                machineId, agentType, version);
    }

    private void validateMachineExists(String machineId) {
        if (machineRepository.findByMachineId(machineId).isEmpty()) {
            throw new MachineNotFoundException("Machine not found: " + machineId);
        }
    }

    private void validateMachineId(String machineId) {
        if (machineId == null || machineId.trim().isEmpty()) {
            throw new InvalidAgentIdException("Machine ID cannot be empty");
        }
    }

    private void validateAgentType(String agentType) {
        if (agentType == null || agentType.trim().isEmpty()) {
            throw new IllegalArgumentException("Agent type cannot be empty");
        }
    }
}

