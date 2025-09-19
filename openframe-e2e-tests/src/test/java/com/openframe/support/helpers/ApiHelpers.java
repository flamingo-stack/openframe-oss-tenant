package com.openframe.support.helpers;

import com.openframe.data.TestDataGenerator;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

@Slf4j
public class ApiHelpers {
    
    private static final String API_SERVICE_URL = "http://openframe-api.microservices.svc.cluster.local:8090";
    private static final String CLIENT_SERVICE_URL = "http://openframe-client.microservices.svc.cluster.local:8097";
    private static final String GATEWAY_URL = "http://openframe-gateway.microservices.svc.cluster.local:8100";
    
    public static RequestSpecification baseSpec() {
        String testId = TestDataGenerator.generateShortUuid();
        return given()
            .header("X-Correlation-Id", TestDataGenerator.generateCorrelationId(testId))
            .header("X-Test-Id", testId)
            .contentType("application/json");
    }

    public static String getActiveManagementKey() {
        Response response = baseSpec()
            .when()
            .get(API_SERVICE_URL + "/agent/registration-secret/active");
        
        response.then().statusCode(200);
        String key = response.jsonPath().getString("key");
        log.debug("Retrieved management key: {}...", key.substring(0, Math.min(10, key.length())));
        return key;
    }

    public static String generateManagementKey() {
        Response response = baseSpec()
            .when()
            .post(API_SERVICE_URL + "/agent/registration-secret/generate");
        
        response.then().statusCode(200);
        return response.jsonPath().getString("key");
    }

    public static String registerAgent(String managementKey, Map<String, Object> agentData) {
        Response response = baseSpec()
            .header("X-Initial-Key", managementKey)
            .body(agentData)
            .when()
            .post(CLIENT_SERVICE_URL + "/api/agents/register");
        
        response.then().statusCode(200);
        String machineId = response.jsonPath().getString("machineId");
        log.debug("Agent registered with machineId: {}", machineId);
        return machineId;
    }

    public static Map<String, String> registerAgentWithCredentials(String managementKey, Map<String, Object> agentData) {
        Response response = baseSpec()
            .header("X-Initial-Key", managementKey)
            .body(agentData)
            .when()
            .post(CLIENT_SERVICE_URL + "/api/agents/register");
        
        response.then().statusCode(200);
        
        Map<String, String> result = new HashMap<>();
        result.put("machineId", response.jsonPath().getString("machineId"));
        result.put("clientId", response.jsonPath().getString("clientId"));
        result.put("clientSecret", response.jsonPath().getString("clientSecret"));
        
        log.debug("Agent registered with machineId: {} and clientId: {}", 
            result.get("machineId"), result.get("clientId"));
        return result;
    }

    public static String getAgentOAuthToken(String clientId, String clientSecret) {
        log.debug("Attempting OAuth token request with clientId: {}", clientId);
        
        Response response = given()
            .formParam("client_id", clientId)
            .formParam("client_secret", clientSecret)
            .formParam("grant_type", "client_credentials")
            .formParam("scope", "agent")
            .when()
            .post(CLIENT_SERVICE_URL + "/oauth/token");

        String responseBody = response.getBody().asString();
        log.debug("OAuth response: status={}, body={}", response.getStatusCode(), responseBody);
        
        if (response.getStatusCode() != 200) {
            log.error("OAuth token request failed with status: {} and body: {}", 
                response.getStatusCode(), responseBody);
            throw new AssertionError("OAuth failed: " + responseBody);
        }
        
        String accessToken = response.jsonPath().getString("accessToken");
        if (accessToken == null) {
            log.error("No accessToken in response: {}", responseBody);
            throw new AssertionError("No accessToken in response: " + responseBody);
        }
        
        return accessToken;
    }

    public static Response graphqlQuery(String query) {
        Map<String, String> payload = Map.of("query", query);
        
        return baseSpec()
            .body(payload)
            .when()
            .post(API_SERVICE_URL + "/graphql");
    }

    public static Map<String, Object> queryDevice(String machineId) {
        String query = String.format(
            "{ device(machineId: \"%s\") { machineId hostname status agentVersion lastSeen } }",
            machineId
        );
        
        Response response = graphqlQuery(query);
        response.then().statusCode(200);
        
        return response.jsonPath().getMap("data.device");
    }

    public static Map<String, Object> queryDevices(int limit, String cursor) {
        String query;
        if (cursor != null) {
            query = String.format(
                "{ devices(pagination: {limit: %d, cursor: \"%s\"}) { edges { node { machineId hostname status } cursor } pageInfo { hasNextPage endCursor } } }",
                limit, cursor
            );
        } else {
            query = String.format(
                "{ devices(pagination: {limit: %d}) { edges { node { machineId hostname status } cursor } pageInfo { hasNextPage endCursor } } }",
                limit
            );
        }
        
        Response response = graphqlQuery(query);
        if (response.getStatusCode() != 200) {
            log.warn("GraphQL query failed with status {}: {}", response.getStatusCode(), response.body().asString());
            return null;
        }
        
        return response.jsonPath().getMap("data.devices");
    }

    public static boolean deleteDevice(String machineId) {
        Response response = baseSpec()
            .when()
            .delete(API_SERVICE_URL + "/devices/" + machineId);
        
        int status = response.getStatusCode();
        return status == 200 || status == 204 || status == 404; // 404 is ok if already deleted
    }
    
    
    public static Map<String, Object> createAgentData(String hostname) {
        Map<String, Object> data = new HashMap<>();
        data.put("hostname", hostname);
        data.put("ip", TestDataGenerator.generateAgentIP());
        data.put("macAddress", TestDataGenerator.generateMacAddress());
        data.put("osUuid", "uuid-" + TestDataGenerator.generateShortUuid());
        data.put("agentVersion", "1.0.0");
        return data;
    }
}