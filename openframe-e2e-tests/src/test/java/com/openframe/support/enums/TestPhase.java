package com.openframe.support.enums;

/**
 * Test phases for structured test execution
 */
public enum TestPhase {
    ARRANGE("Setting up test data"),
    ACT("Executing action"), 
    ASSERT("Verifying outcome"),
    CLEANUP("Cleaning up test data");
    
    private final String description;
    
    TestPhase(String description) {
        this.description = description;
    }
    
    @Override
    public String toString() {
        return description;
    }
}

