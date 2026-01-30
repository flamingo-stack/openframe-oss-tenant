package com.openframe.api;

import com.openframe.data.dto.device.DeviceFilterInput;
import com.openframe.data.dto.device.DeviceFilters;
import com.openframe.data.dto.device.DeviceStatus;
import com.openframe.data.dto.device.Machine;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.openframe.api.graphql.DeviceQueries.*;
import static com.openframe.config.ApiConfig.GRAPHQL;
import static com.openframe.helpers.RequestSpecHelper.getAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class DeviceApi {

    private static final String DEVICES = "api/devices/{machineId}";

    public static List<String> getDeviceHostnames(DeviceFilterInput filter) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", DEVICE_HOSTNAMES);
        body.put("variables", Map.of("filter", filter));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getList("data.devices.edges.node.hostname", String.class);
    }

    public static List<String> getDeviceIds(DeviceFilterInput filter) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", DEVICE_IDS);
        body.put("variables", Map.of("filter", filter));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().get("data.devices.edges.node.machineId");
    }

    public static Machine getDevice(String machineId) {
        Map<String, Object> body = Map.of(
                "query", FULL_DEVICE,
                "variables", Map.of("machineId", machineId)
        );
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getObject("data.device", Machine.class);
    }

    public static List<Machine> getDevices(DeviceFilterInput filter) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", DEVICES_WITH_FILTER);
        body.put("variables", Map.of("filter", filter));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getList("data.devices.edges.node", Machine.class);
    }

    public static void updateDeviceStatus(Machine device, DeviceStatus status) {
        given(getAuthorizedSpec())
                .pathParam("machineId", device.getMachineId())
                .body(Map.of("status", status))
                .patch(DEVICES)
                .then().statusCode(204);
    }

    public static void archiveDevice(Machine device) {
        updateDeviceStatus(device, DeviceStatus.ARCHIVED);
    }

    public static void deleteDevice(Machine device) {
        updateDeviceStatus(device, DeviceStatus.DELETED);
    }

    public static Machine searchDevice(DeviceFilterInput filter, String search) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", SEARCH_DEVICE);
        body.put("variables", Map.of("filter", filter, "search", search));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getObject("data.devices.edges[0].node", Machine.class);
    }

    public static DeviceFilters getDeviceFilters() {
        Map<String, String> body = Map.of("query", DEVICE_FILTERS);
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getObject("data.deviceFilters", DeviceFilters.class);
    }
}
