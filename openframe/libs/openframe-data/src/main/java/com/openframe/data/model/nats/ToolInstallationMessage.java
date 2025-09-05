package com.openframe.data.model.nats;

import com.openframe.core.model.ToolAgentAsset;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ToolInstallationMessage {

    private String toolId;
    private String version;
    private List<String> installationCommandArgs;
    private List<String> runCommandArgs;
    // TODO: avoid mongo models at event
    private List<ToolAgentAsset> assets;

}
