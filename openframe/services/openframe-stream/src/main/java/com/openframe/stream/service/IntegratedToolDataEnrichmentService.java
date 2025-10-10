package com.openframe.stream.service;

import com.openframe.data.model.redis.CachedMachineInfo;
import com.openframe.data.model.redis.CachedOrganizationInfo;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.DataEnrichmentServiceType;
import com.openframe.data.repository.redis.MachineIdCacheService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class IntegratedToolDataEnrichmentService implements DataEnrichmentService<DeserializedDebeziumMessage> {

    private final MachineIdCacheService machineIdCacheService;

    public IntegratedToolDataEnrichmentService(MachineIdCacheService machineIdCacheService) {
        this.machineIdCacheService = machineIdCacheService;
    }

    @Override
    public IntegratedToolEnrichedData getExtraParams(DeserializedDebeziumMessage message) {
        IntegratedToolEnrichedData integratedToolEnrichedData = new IntegratedToolEnrichedData();
        if (message == null || message.getAgentId() == null) {
            return integratedToolEnrichedData;
        }

        String agentId = message.getAgentId();
        CachedMachineInfo machine = machineIdCacheService.getMachine(agentId);
        if (machine != null) {
            CachedOrganizationInfo organization = machineIdCacheService.getOrganization(machine.getOrganizationId());
            log.debug("Found machine ID {} for agent {} (organization {})", machine.getMachineId(), agentId, machine.getOrganizationId());
            integratedToolEnrichedData.setMachineId(machine.getMachineId());
            integratedToolEnrichedData.setHostname(machine.getHostname());
            if (organization != null) {
                integratedToolEnrichedData.setOrganizationId(organization.getOrganizationId());
                integratedToolEnrichedData.setOrganizationName(organization.getName());
            }
            return integratedToolEnrichedData;
        } else {
            log.warn("Machine ID not found for agent: {}", agentId);
            return integratedToolEnrichedData;
        }
    }

    @Override
    public DataEnrichmentServiceType getType() {
        return DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS;
    }
}
