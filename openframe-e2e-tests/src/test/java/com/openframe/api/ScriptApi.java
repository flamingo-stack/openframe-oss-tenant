package com.openframe.api;

import com.openframe.data.dto.script.Script;
import io.restassured.http.ContentType;

import java.util.List;

import static com.openframe.helpers.RequestSpecHelper.getAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class ScriptApi {

    private static final String SCRIPTS = "tools/tactical-rmm/scripts/";
    private static final String SCRIPT = SCRIPTS + "{id}/";

    public static List<Script> listScripts() {
        return given(getAuthorizedSpec())
                .get(SCRIPTS)
                .then().statusCode(200)
                .extract().jsonPath().getList(".", Script.class);
    }

    public static Script getScript(Integer id) {
        return given(getAuthorizedSpec())
                .accept(ContentType.JSON)
                .pathParam("id", id)
                .get(SCRIPT).then().statusCode(200)
                .extract().as(Script.class);
    }

    public static String editScript(Script script) {
        return given(getAuthorizedSpec())
                .pathParam("id", script.getId())
                .body(script)
                .put(SCRIPT)
                .then().statusCode(200)
                .extract().asString();
    }

    public static String addScript(Script script) {
        return given(getAuthorizedSpec())
                .body(script)
                .post(SCRIPTS)
                .then().statusCode(200)
                .extract().asString();
    }
}
