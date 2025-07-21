package com.openframe.data.model.enums;

import lombok.Getter;

import java.util.List;

@Getter
public enum MessageType {

    MESHCENTRAL_EVENT(IntegratedToolType.MESHCENTRAL, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA)),
    TACTICAL_RMM_EVENT(IntegratedToolType.TACTICAL, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA)),
    FLEET_MDM_EVENT(IntegratedToolType.TACTICAL, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA));

    private final IntegratedToolType integratedToolType;

    private final DataEnrichmentServiceType dataEnrichmentServiceType;

    private final List<Destination> destinationList;

    MessageType(IntegratedToolType integratedToolType, DataEnrichmentServiceType dataEnrichmentServiceType, List<Destination> destinationList) {
        this.integratedToolType = integratedToolType;
        this.dataEnrichmentServiceType = dataEnrichmentServiceType;
        this.destinationList = destinationList;
    }
}
