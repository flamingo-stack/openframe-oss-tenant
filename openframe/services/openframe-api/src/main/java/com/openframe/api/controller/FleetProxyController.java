package com.openframe.api.controller;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.openframe.data.model.IntegratedToolTypes;
import com.openframe.data.service.IntegratedToolService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/fleet")
@RequiredArgsConstructor
public class FleetProxyController {

    @Value("${fleet.api.url}")
    private String fleetApiUrl;

    private final RestTemplate restTemplate;
    private final IntegratedToolService integratedToolService;

    @RequestMapping("/**")
    public ResponseEntity<String> proxyRequest(
            HttpServletRequest request,
            @RequestBody(required = false) String body,
            @RequestHeader HttpHeaders headers) {

        // Remove the /api prefix from the request path
        String path = request.getRequestURI().replace("/api/fleet", "");
        
        // Build the target URL
        URI uri = UriComponentsBuilder
                .fromUriString(fleetApiUrl)
                .path(path)
                .query(request.getQueryString())
                .build()
                .toUri();

        // Get token from IntegratedToolService
        String token = integratedToolService.getActiveToken(IntegratedToolTypes.FLEET);
        if (token == null) {
            throw new RuntimeException("No valid Fleet token available");
        }

        // Add Fleet API token to headers
        headers.set("Authorization", "Bearer " + token);

        // Forward the request to Fleet
        HttpEntity<String> httpEntity = new HttpEntity<>(body, headers);
        return restTemplate.exchange(uri, HttpMethod.valueOf(request.getMethod()), httpEntity, String.class);
    }
} 