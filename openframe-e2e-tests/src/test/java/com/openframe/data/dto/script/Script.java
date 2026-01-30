package com.openframe.data.dto.script;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Script {
    private Integer id;
    private String name;
    private String description;
    private String shell;
    private List<String> args;
    private String category;
    private Boolean favorite;

    @JsonProperty("script_type")
    private String scriptType;

    @JsonProperty("script_body")
    private String scriptBody;

    @JsonProperty("script_hash")
    private String scriptHash;

    @JsonProperty("default_timeout")
    private Integer defaultTimeout;

    private String syntax;
    private String filename;
    private Boolean hidden;

    @JsonProperty("supported_platforms")
    private List<String> supportedPlatforms;

    @JsonProperty("run_as_user")
    private Boolean runAsUser;

    @JsonProperty("env_vars")
    private List<String> envVars;
}
