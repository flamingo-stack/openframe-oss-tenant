package com.openframe.api;

import com.openframe.data.dto.log.LogDetails;
import com.openframe.data.dto.log.LogEvent;
import com.openframe.data.dto.log.LogFilterInput;
import com.openframe.data.dto.log.LogFilters;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.openframe.api.graphql.LogQueries.*;
import static com.openframe.config.ApiConfig.GRAPHQL;
import static com.openframe.helpers.RequestSpecHelper.getAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class LogsApi {

    public static LogFilters getLogFilters() {
        Map<String, String> body = Map.of("query", LOG_FILTERS);
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getObject("data.logFilters", LogFilters.class);
    }

    public static List<LogEvent> getLogs() {
        Map<String, String> body = Map.of("query", LOGS);
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getList("data.logs.edges.node", LogEvent.class);
    }

    public static List<LogEvent> getLogs(LogFilterInput filter) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", LOGS);
        body.put("variables", Map.of("filter", filter));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getList("data.logs.edges.node", LogEvent.class);
    }

    public static List<LogEvent> searchLogs(String search) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", LOGS);
        body.put("variables", Map.of("search", search));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getList("data.logs.edges.node", LogEvent.class);
    }

    public static LogDetails getLogDetails(LogEvent logEvent) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", LOG_DETAILS);
        body.put("variables", Map.of(
                "ingestDay", logEvent.getIngestDay(),
                "toolType", logEvent.getToolType(),
                "eventType", logEvent.getEventType(),
                "timestamp", logEvent.getTimestamp(),
                "toolEventId", logEvent.getToolEventId()
        ));
        return given(getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().statusCode(200)
                .extract().jsonPath().getObject("data.logDetails", LogDetails.class);
    }
}
