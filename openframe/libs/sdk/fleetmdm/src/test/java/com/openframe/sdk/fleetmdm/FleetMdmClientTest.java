package com.openframe.sdk.fleetmdm;

import com.openframe.sdk.fleetmdm.model.Host;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FleetMdmClientTest {

    @Mock HttpClient httpClient;
    @Mock HttpResponse<String> httpResponse;

    FleetMdmClient client;

    @BeforeEach
    void setUp() {
        client = new FleetMdmClient("https://fleet.example.com", "token", httpClient);
    }

    @Test
    void getHostById_success() throws IOException, InterruptedException {
        String body = """
            { "host": { "id": 1, "hostname": "mac" } }
            """;
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(body);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        Host host = client.getHostById(1);
        assertNotNull(host);
        assertEquals(1L, host.getId());
        assertEquals("mac", host.getHostname());
    }

    @Test
    void getHostById_notFound() throws IOException, InterruptedException {
        when(httpResponse.statusCode()).thenReturn(404);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        Host host = client.getHostById(42);
        assertNull(host);
    }

    @Test
    void getHostById_error() throws IOException, InterruptedException {
        when(httpResponse.statusCode()).thenReturn(500);
        when(httpResponse.body()).thenReturn("err");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        assertThrows(RuntimeException.class, () -> client.getHostById(1));
    }
} 