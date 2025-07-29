package com.openframe.sdk.fleetmdm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.sdk.fleetmdm.model.Host;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Main client for working with Fleet MDM REST API
 */
public class FleetMdmClient {

    private static final String GET_HOST_URL = "/api/v1/fleet/hosts/";

    private final String baseUrl;
    private final String apiToken;
    private final HttpClient httpClient;

    /**
     * Thread-safe reusable {@link ObjectMapper}. Creating it once is cheaper than instantiating a new one
     * every request.
     */
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Constructor intended for unit-tests – allows passing a pre-configured or mocked {@link HttpClient}.
     */
    FleetMdmClient(String baseUrl, String apiToken, HttpClient httpClient) {
        this.baseUrl  = baseUrl;
        this.apiToken = apiToken;
        this.httpClient = httpClient;
    }

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
     * Get a single host by ID from Fleet MDM
     * @param id Host ID
     * @return Host object or null if not found
     */
    public Host getHostById(long id) throws IOException, InterruptedException {
        HttpRequest request = addHeaders(HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + GET_HOST_URL + id)))
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

        return MAPPER.treeToValue(MAPPER.readTree(response.body()).path("host"), Host.class);
    }

    private HttpRequest.Builder addHeaders(HttpRequest.Builder builder) {
        return builder
                .header("Authorization", "Bearer " + apiToken)
                .header("Accept", "application/json");
    }
}
