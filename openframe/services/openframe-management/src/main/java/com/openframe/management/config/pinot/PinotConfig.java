package com.openframe.management.config.pinot;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PinotConfig {
    private String name;
    private String schemaFile;
    private String tableConfigFile;
} 