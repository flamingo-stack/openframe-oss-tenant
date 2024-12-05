package com.openframe.api.service;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.openframe.api.config.FleetProperties;
import com.openframe.api.dto.fleet.DeviceInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetIntegrationService {
    private final WebClient webClient;
    private final FleetProperties fleetProperties;

    public void enrollDevice(String machineId) {
        // Call Fleet's enrollment API
        webClient.post()
            .uri(fleetProperties.getBaseUrl() + "/api/v1/fleet/enroll")
            .bodyValue(Map.of("machine_id", machineId))
            .retrieve()
            .bodyToMono(Void.class)
            .block();
    }

    public DeviceInfo getDeviceInfo(String machineId) {
        // Get device info from Fleet
        return webClient.get()
            .uri(fleetProperties.getBaseUrl() + "/api/v1/fleet/devices/" + machineId)
            .retrieve()
            .bodyToMono(DeviceInfo.class)
            .block();
    }
} 