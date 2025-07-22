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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FleetMdmClientTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    private HttpResponse<String> httpResponse;

    private FleetMdmClient fleetMdmClient;

    @BeforeEach
    void setUp() {
        fleetMdmClient = new FleetMdmClient("https://fleet.example.com", "test-token", httpClient);
    }

    @Test
    void testGetHosts_Success() throws IOException, InterruptedException {
        // Arrange
        String responseBody = """
            {
                "hosts": [
                    {
                        "id": 1,
                        "hostname": "host-1",
                        "uuid": "uuid-1",
                        "platform": "darwin",
                        "os_version": "10.15.7",
                        "primary_ip": "192.168.1.100"
                    },
                    {
                        "id": 2,
                        "hostname": "host-2",
                        "uuid": "uuid-2",
                        "platform": "windows",
                        "os_version": "10.0.19044",
                        "primary_ip": "192.168.1.101"
                    }
                ]
            }
            """;

        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act
        List<Host> hosts = fleetMdmClient.getHosts();

        // Assert
        assertNotNull(hosts);
        assertEquals(2, hosts.size());
        
        Host firstHost = hosts.get(0);
        assertEquals(1L, firstHost.getId());
        assertEquals("host-1", firstHost.getHostname());
        assertEquals("darwin", firstHost.getPlatform());
        assertEquals("10.15.7", firstHost.getOsVersion());
        assertEquals("192.168.1.100", firstHost.getPrimaryIp());
        
        Host secondHost = hosts.get(1);
        assertEquals(2L, secondHost.getId());
        assertEquals("host-2", secondHost.getHostname());
        assertEquals("windows", secondHost.getPlatform());
    }

    @Test
    void testGetHosts_EmptyResponse() throws IOException, InterruptedException {
        // Arrange
        String responseBody = """
            {
                "hosts": []
            }
            """;

        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act
        List<Host> hosts = fleetMdmClient.getHosts();

        // Assert
        assertNotNull(hosts);
        assertTrue(hosts.isEmpty());
    }

    @Test
    void testGetHosts_ApiError() throws IOException, InterruptedException {
        // Arrange
        when(httpResponse.statusCode()).thenReturn(500);
        when(httpResponse.body()).thenReturn("Internal Server Error");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> fleetMdmClient.getHosts());
    }

    @Test
    void testGetHostById_Success() throws IOException, InterruptedException {
        // Arrange
        String responseBody = """
            {
                "host": {
                    "id": 1,
                    "hostname": "host-1",
                    "uuid": "uuid-1",
                    "platform": "darwin",
                    "os_version": "10.15.7",
                    "primary_ip": "192.168.1.100",
                    "team_id": 1,
                    "team_name": "Engineering"
                }
            }
            """;

        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act
        Host host = fleetMdmClient.getHostById(1L);

        // Assert
        assertNotNull(host);
        assertEquals(1L, host.getId());
        assertEquals("host-1", host.getHostname());
        assertEquals("darwin", host.getPlatform());
        assertEquals("10.15.7", host.getOsVersion());
        assertEquals("192.168.1.100", host.getPrimaryIp());
        assertEquals(1L, host.getTeamId());
        assertEquals("Engineering", host.getTeamName());
    }

    @Test
    void testGetHostById_NotFound() throws IOException, InterruptedException {
        // Arrange
        when(httpResponse.statusCode()).thenReturn(404);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act
        Host host = fleetMdmClient.getHostById(999L);

        // Assert
        assertNull(host);
    }

    @Test
    void testGetHostById_ApiError() throws IOException, InterruptedException {
        // Arrange
        when(httpResponse.statusCode()).thenReturn(500);
        when(httpResponse.body()).thenReturn("Internal Server Error");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(httpResponse);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> fleetMdmClient.getHostById(1L));
    }
} 