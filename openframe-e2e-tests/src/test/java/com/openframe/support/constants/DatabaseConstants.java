package com.openframe.support.constants;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class DatabaseConstants {

    private static final String DEFAULT_MONGODB_URI = "mongodb://openframe:password123456789@mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe?authSource=admin&connectTimeoutMS=10000&socketTimeoutMS=10000&serverSelectionTimeoutMS=10000";
    private static final String DEFAULT_DATABASE_NAME = "openframe";

    public static final String MONGODB_URI = getMongoDbUri();
    public static final String DATABASE_NAME = getDatabaseName();
    
    private static String getMongoDbUri() {
        String uri = System.getProperty("mongodb.uri");
        if (uri != null && !uri.trim().isEmpty()) {
            log.info("Using MongoDB URI from command line");
            return uri;
        }

        uri = System.getenv("MONGODB_URI");
        if (uri != null && !uri.trim().isEmpty()) {
            log.info("Using MongoDB URI from environment");
            return uri;
        }

        log.info("Using default MongoDB URI");
        return DEFAULT_MONGODB_URI;
    }
    
    private static String getDatabaseName() {
        String dbName = System.getProperty("mongodb.database");
        if (dbName != null && !dbName.trim().isEmpty()) {
            log.info("Using database name from command line: {}", dbName);
            return dbName;
        }

        dbName = System.getenv("MONGODB_DATABASE");
        if (dbName != null && !dbName.trim().isEmpty()) {
            log.info("Using database name from environment: {}", dbName);
            return dbName;
        }

        log.info("Using default database name: {}", DEFAULT_DATABASE_NAME);
        return DEFAULT_DATABASE_NAME;
    }
}
