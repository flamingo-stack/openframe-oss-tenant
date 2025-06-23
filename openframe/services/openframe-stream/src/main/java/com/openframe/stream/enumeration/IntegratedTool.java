package com.openframe.stream.enumeration;

public enum IntegratedTool {

    MESHCENTRAL ("meshcentral"),
    TACTICAL ("tacticalrmm");

    private final String dbName;

    IntegratedTool(String name) {
        this.dbName = name;
    }

    public String getDbName() {
        return dbName;
    }
}
