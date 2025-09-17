package com.openframe.stream.service;

import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.DataEnrichmentServiceType;
import com.openframe.data.service.MachineIdCacheService;
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
        String machineId = machineIdCacheService.getMachineId(agentId);
        
        if (machineId != null) {
            log.debug("Found machine ID {} for agent {}", machineId, agentId);
            integratedToolEnrichedData.setMachineId(machineId);
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
