package com.openframe.data.model.enums;

public enum IntegratedToolType {

    MESHCENTRAL ("meshcentral"),
    TACTICAL ("tacticalrmm"),
    FLEET ("fleet-mdm");

    private final String dbName;

    IntegratedToolType(String name) {
        this.dbName = name;
    }

    public String getDbName() {
        return dbName;
    }
}
