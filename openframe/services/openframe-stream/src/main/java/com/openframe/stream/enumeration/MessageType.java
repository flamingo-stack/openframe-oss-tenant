package com.openframe.stream.enumeration;

import lombok.Getter;

import java.util.List;

@Getter
public enum MessageType {

    MESHCENTRAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA)),
    TACTICAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA));

    private final DataEnrichmentServiceType dataEnrichmentServiceType;

    private final List<Destination> destinationList;

    MessageType(DataEnrichmentServiceType dataEnrichmentServiceType, List<Destination> destinationList) {
        this.dataEnrichmentServiceType = dataEnrichmentServiceType;
        this.destinationList = destinationList;
    }
}
