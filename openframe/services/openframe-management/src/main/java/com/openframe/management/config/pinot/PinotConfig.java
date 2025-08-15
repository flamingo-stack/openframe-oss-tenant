package com.openframe.management.config.pinot;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PinotConfig {
    private String name;
    private String schemaFile;
    private String tableConfigFile;
} 