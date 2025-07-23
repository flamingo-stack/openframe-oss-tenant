package com.openframe.sdk.fleetmdm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.sdk.fleetmdm.model.Host;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

/**
 * Main client for working with Fleet MDM REST API
 */
public class FleetMdmClient {
    private final String baseUrl;
    private final String apiToken;
    private final HttpClient httpClient;

    /**
     * @param baseUrl  Base URL of Fleet MDM (e.g., https://fleet.example.com)
     * @param apiToken API token for authorization
     */
    public FleetMdmClient(String baseUrl, String apiToken) {
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Constructor for testing - allows injection of HttpClient
     * @param baseUrl  Base URL of Fleet MDM
     * @param apiToken API token for authorization
     * @param httpClient HttpClient instance (for testing)
     */
    FleetMdmClient(String baseUrl, String apiToken, HttpClient httpClient) {
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
        this.httpClient = httpClient;
    }

    /**
     * Get list of devices (hosts) from Fleet MDM
     */
    public List<Host> getHosts() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/fleet/hosts"))
                .header("Authorization", "Bearer " + apiToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 401) {
            throw new RuntimeException("Authentication failed. Please check your API token. Response: " + response.body());
        } else if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to fetch hosts. Status: " + response.statusCode() + ", Response: " + response.body());
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(response.body());
        JsonNode hostsNode = root.get("hosts");
        
        List<Host> hosts = new ArrayList<>();
        if (hostsNode != null && hostsNode.isArray()) {
            for (JsonNode hostNode : hostsNode) {
                Host host = mapper.treeToValue(hostNode, Host.class);
                hosts.add(host);
            }
        }
        
        return hosts;
    }

    /**
     * Get a single host by ID from Fleet MDM
     * @param id Host ID
     * @return Host object or null if not found
     */
    public Host getHostById(long id) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/fleet/hosts/" + id))
                .header("Authorization", "Bearer " + apiToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 401) {
            throw new RuntimeException("Authentication failed. Please check your API token. Response: " + response.body());
        } else if (response.statusCode() == 404) {
            return null; // Host not found
        } else if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to fetch host. Status: " + response.statusCode() + ", Response: " + response.body());
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(response.body());
        return mapper.treeToValue(root.get("host"), Host.class);
    }
}
