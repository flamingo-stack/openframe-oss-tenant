package com.openframe.data.generator;

import com.openframe.data.dto.script.Script;

import java.util.List;

public class ScriptGenerator {

    public static Script addScriptRequest() {
        return Script.builder()
                .name("Dir")
                .description("List files in folder")
                .scriptType("userdefined")
                .shell("powershell")
                .args(List.of("dirName"))
                .category("Custom")
                .favorite(false)
                .scriptBody("dir")
                .defaultTimeout(90)
                .hidden(false)
                .supportedPlatforms(List.of("windows"))
                .runAsUser(false)
                .envVars(List.of("ENVVAR=varValue"))
                .build();
    }

    public static String addScriptResponse(Script script) {
        return "\"%s was added!\"".formatted(script.getName());
    }

    public static String editScriptResponse(Script script) {
        return "\"%s was edited!\"".formatted(script.getName());
    }
}
