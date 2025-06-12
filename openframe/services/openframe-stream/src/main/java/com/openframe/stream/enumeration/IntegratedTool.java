package com.openframe.stream.enumeration;

public enum IntegratedTool {

    MESHCENTRAL ("meshcentral"),
    TACTICAL ("tactical-rmm");

    private final String name;

    IntegratedTool(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
