package com.openframe.data.model.enums;

import lombok.Getter;

import java.util.List;

@Getter
public enum MessageType {

    MESHCENTRAL_EVENT(IntegratedToolType.MESHCENTRAL, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA), EventHandlerType.COMMON_TYPE),
    TACTICAL_RMM_EVENT(IntegratedToolType.TACTICAL, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA), EventHandlerType.COMMON_TYPE),
    FLEET_MDM_EVENT(IntegratedToolType.FLEET, DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA), EventHandlerType.COMMON_TYPE);

    private final IntegratedToolType integratedToolType;

    private final DataEnrichmentServiceType dataEnrichmentServiceType;

    private final List<Destination> destinationList;

    private final EventHandlerType eventHandlerType;

    MessageType(IntegratedToolType integratedToolType, DataEnrichmentServiceType dataEnrichmentServiceType, List<Destination> destinationList, EventHandlerType eventHandlerType) {
        this.integratedToolType = integratedToolType;
        this.dataEnrichmentServiceType = dataEnrichmentServiceType;
        this.destinationList = destinationList;
        this.eventHandlerType = eventHandlerType;
    }
}
