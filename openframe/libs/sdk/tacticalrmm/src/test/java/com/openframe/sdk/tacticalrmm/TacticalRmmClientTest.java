package com.openframe.sdk.tacticalrmm;

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
class TacticalRmmClientTest {

    @Mock HttpClient httpClient;
    @Mock HttpResponse<String> httpResponse;

    TacticalRmmClient client;

    @BeforeEach
    void setUp() {
        client = new TacticalRmmClient("http://tactical-nginx.integrated-tools.svc.cluster.local:8000", httpClient);
    }

    @Test
    void getInstallationSecret_success() throws IOException, InterruptedException {
        String body = "secret-value";
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(body);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        String secret = client.getInstallationSecret();
        assertNotNull(secret);
        assertEquals("secret-value", secret);
    }

    @Test
    void getInstallationSecret_notFound() throws IOException, InterruptedException {
        when(httpResponse.statusCode()).thenReturn(404);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        String secret = client.getInstallationSecret();
        assertNull(secret);
    }

    @Test
    void getInstallationSecret_error() throws IOException, InterruptedException {
        when(httpResponse.statusCode()).thenReturn(500);
        when(httpResponse.body()).thenReturn("err");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(httpResponse);

        assertThrows(RuntimeException.class, () -> client.getInstallationSecret());
    }
}


