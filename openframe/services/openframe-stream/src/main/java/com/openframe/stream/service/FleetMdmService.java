package com.openframe.stream.service;

import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import com.openframe.stream.model.fleet.FleetHost;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for Fleet MDM operations using the Fleet MDM SDK
 * Replaces direct database access with REST API calls
 */
@Service
public class FleetMdmService {

    private final FleetMdmClient fleetMdmClient;

    public FleetMdmService(
            @Value("${fleet.mdm.base-url:https://fleet.example.com}") String baseUrl,
            @Value("${fleet.mdm.api-token:}") String apiToken) {
        this.fleetMdmClient = new FleetMdmClient(baseUrl, apiToken);
    }

    /**
     * Get all hosts from Fleet MDM
     * @return List of FleetHost objects
     */
    public List<FleetHost> getAllHosts() {
        try {
            List<Host> hosts = fleetMdmClient.getHosts();
            return hosts.stream()
                    .map(this::convertToFleetHost)
                    .collect(Collectors.toList());
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to fetch hosts from Fleet MDM", e);
        }
    }

    /**
     * Get host by ID from Fleet MDM
     * @param id Host ID
     * @return Optional FleetHost object
     */
    public Optional<FleetHost> getHostById(Integer id) {
        try {
            Host host = fleetMdmClient.getHostById(id.longValue());
            return Optional.ofNullable(host)
                    .map(this::convertToFleetHost);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to fetch host from Fleet MDM", e);
        }
    }

    /**
     * Get host by UUID (agent_id) from Fleet MDM
     * @param uuid Host UUID
     * @return Optional FleetHost object
     */
    public Optional<FleetHost> getHostByUuid(String uuid) {
        try {
            List<Host> hosts = fleetMdmClient.getHosts();
            return hosts.stream()
                    .filter(host -> uuid.equals(host.getUuid()))
                    .findFirst()
                    .map(this::convertToFleetHost);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to fetch hosts from Fleet MDM", e);
        }
    }

    /**
     * Convert SDK Host model to FleetHost model
     * @param host SDK Host object
     * @return FleetHost object
     */
    private FleetHost convertToFleetHost(Host host) {
        return new FleetHost(
                host.getId().intValue(),
                host.getUuid()
        );
    }
} 