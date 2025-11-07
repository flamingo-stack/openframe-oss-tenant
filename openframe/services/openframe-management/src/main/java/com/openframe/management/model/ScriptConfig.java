package com.openframe.management.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration model for Tactical RMM script initialization.
 * 
 * This class defines the properties needed to create or update
 * a script in Tactical RMM during application startup.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScriptConfig {
    
    /**
     * The name of the script as it will appear in Tactical RMM
     */
    private String name;
    
    /**
     * The classpath resource path to the script file
     * Example: "classpath:scripts/my-script.ps1"
     */
    private String resourcePath;
    
    /**
     * Description of what the script does
     */
    private String description;
    
    /**
     * The shell/interpreter to use for the script
     * Examples: "powershell", "bash", "python", "cmd"
     */
    private String shell;
    
    /**
     * Category for organizing scripts in Tactical RMM
     */
    private String category;
    
    /**
     * Default timeout in seconds for script execution
     */
    private Integer defaultTimeout;
}

