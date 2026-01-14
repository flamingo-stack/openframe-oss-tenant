package com.openframe.api;

import com.openframe.support.helpers.RequestSpecHelper;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class OrganizationApi {

    private static final String GRAPHQL = "api/graphql";

    public static List<String> getOrganizationNames() {
        String query = """
                query {
                    organizations {
                        edges {
                            node { name }
                        }
                    }
                }
                """;
        Map<String, String> body = Map.ofEntries(Map.entry("query", query));
        return given(RequestSpecHelper.getAuthorizedSpec())
                .body(body).post(GRAPHQL)
                .then().extract().jsonPath().getList("data.organizations.edges.node.name", String.class);
    }
}
