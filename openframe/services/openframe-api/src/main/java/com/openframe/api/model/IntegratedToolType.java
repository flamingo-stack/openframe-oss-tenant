package com.openframe.api.model;

public enum IntegratedToolType {
    FLEET("Fleet MDM"),
    AUTHENTIK("Authentik"),
    FERRUMGATE("FerrumGate"),
    NINEMINDS("NineMinds");

    private final String displayName;

    IntegratedToolType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
} 