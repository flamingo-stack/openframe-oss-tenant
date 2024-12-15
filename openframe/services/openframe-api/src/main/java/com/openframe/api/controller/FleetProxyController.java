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

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/fleet")
public class FleetProxyController {

    @Value("${fleet.api.url}")
    private String fleetApiUrl;

    @Value("${fleet.api.token}")
    private String fleetApiToken;

    private final RestTemplate restTemplate;

    public FleetProxyController() {
        this.restTemplate = new RestTemplate();
    }

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

        // Add Fleet API token to headers
        headers.set("Authorization", "Bearer " + fleetApiToken);

        // Forward the request to Fleet
        HttpEntity<String> httpEntity = new HttpEntity<>(body, headers);
        return restTemplate.exchange(uri, HttpMethod.valueOf(request.getMethod()), httpEntity, String.class);
    }
} 