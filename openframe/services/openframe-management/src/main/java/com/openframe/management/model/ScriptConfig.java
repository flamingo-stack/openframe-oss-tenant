package com.openframe.management.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScriptConfig {
    
    private String name;
    private String resourcePath;
    private String description;
    private String shell;
    private String category;
    private Integer defaultTimeout;

}

