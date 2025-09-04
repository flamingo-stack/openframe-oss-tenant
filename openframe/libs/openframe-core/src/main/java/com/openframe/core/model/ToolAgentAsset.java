package com.openframe.core.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
// TODO: main binary should be defined as asset too
//  every assert should have name
// TODO: save name
public class ToolAgentAsset {
    
    private String id;
    private String localFilename;
    private ToolAgentAssetSource source;
    private String path;
    
}