package com.openframe.sdk.tacticalrmm;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Main client for working with Tactical RMM REST API
 */
public class TacticalRmmClient {

    private static final String GET_INSTALLER_URL = "/agents/installer/";

    private final String baseUrl;
    private final HttpClient httpClient;

    /**
     * Package-private constructor for unit tests that need a custom/mock HttpClient.
     */
    TacticalRmmClient(String baseUrl, HttpClient httpClient) {
        this.baseUrl = baseUrl;
        this.httpClient = httpClient;
    }

    /**
     * @param baseUrl Base URL of Tactical RMM (e.g., http://tactical-nginx.integrated-tools.svc.cluster.local:8000)
     */
    public TacticalRmmClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Get installation secret from Tactical RMM agents installer endpoint
     * @return secret string or null if not found (404)
     */
    public String getInstallationSecret() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + GET_INSTALLER_URL))
                .POST(HttpRequest.BodyPublishers.ofString(
                        """
                                {
                                    "installMethod": "manual",
                                    "client": 1,
                                    "site": 1,
                                    "expires": 2400,
                                    "agenttype": "server",
                                    "power": 0,
                                    "rdp": 0,
                                    "ping": 0,
                                    "goarch": "amd64",
                                    "api": "http://tactical-nginx.integrated-tools.svc.cluster.local:8000",
                                    "fileName": "trmm-defaultorganization-defaultsite-server-amd64.exe",
                                    "plat": "windows"
                                }
                                """))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("X-API-KEY", "EVEUGXBNFQHE302VD0JIBZFRQMUK9JJP")
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 404) {
            return null;
        } else if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to fetch installation secret. Status: " + response.statusCode() + ", Response: " + response.body());
        }

        String body = response.body();
        String parsed = RegistrationSecretParser.parse(body);
        return parsed != null ? parsed : body;
    }
}


