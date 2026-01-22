package com.openframe.config;

import lombok.extern.slf4j.Slf4j;


@Slf4j
public class EnvironmentConfig {

    public static final String DEFAULT_BASE_URL = "https://localhost/";
    private static final String DEFAULT_MONGODB_URI = "mongodb://mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe";

    private static final String DEFAULT_DATABASE_NAME = "openframe";
    private static final String DEFAULT_MONGO_USER = "openframe";
    private static final String DEFAULT_MONGO_PASSWORD = "password123456789";
    private static final String DEFAULT_AUTH_DATABASE = "admin";

    public static final String USER_FILE = "user.json";

    private static String baseUrl;
    private static String mongoUri;
    private static String dbName;
    private static String mongoUser;
    private static String mongoPassword;
    private static String authDatabase;

    public static String getBaseUrl() {
        if (baseUrl == null) {
            String cmdVar = System.getProperty("api.base.url");
            String envVar = System.getenv("API_BASE_URL");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                baseUrl = cmdVar.endsWith("/") ? cmdVar : cmdVar.concat("/");
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                baseUrl = envVar.endsWith("/") ? envVar : envVar.concat("/");
            } else {
                baseUrl = DEFAULT_BASE_URL;
            }
            log.info("BASE_URL: {}", baseUrl);
        }
        return baseUrl;
    }

    public static String getMongoDbUri() {
        if (mongoUri == null) {
            String cmdVar = System.getProperty("mongodb.uri");
            String envVar = System.getenv("MONGODB_URI");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                mongoUri = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                mongoUri = envVar;
            } else {
                mongoUri = DEFAULT_MONGODB_URI;
            }
            log.info("MONGODB_URI: {}", mongoUri);
        }
        return mongoUri;
    }

    public static String getDatabaseName() {
        if (dbName == null) {
            String cmdVar = System.getProperty("mongodb.database");
            String envVar = System.getenv("MONGODB_DATABASE");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                dbName = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                dbName = envVar;
            } else {
                dbName = DEFAULT_DATABASE_NAME;
            }
            log.info("MONGODB_DATABASE: {}", dbName);
        }
        return dbName;
    }

    public static String getMongoUser() {
        if (mongoUser == null) {
            String cmdVar = System.getProperty("mongodb.user");
            String envVar = System.getenv("MONGODB_USER");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                mongoUser = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                mongoUser = envVar;
            } else {
                mongoUser = DEFAULT_MONGO_USER;
            }
            log.info("MONGODB_USER: {}", mongoUser);
        }
        return mongoUser;
    }

    public static String getMongoPassword() {
        if (mongoPassword == null) {
            String cmdVar = System.getProperty("mongodb.password");
            String envVar = System.getenv("MONGODB_PASSWORD");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                mongoPassword = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                mongoPassword = envVar;
            } else {
                mongoPassword = DEFAULT_MONGO_PASSWORD;
            }
        }
        return mongoPassword;
    }

    public static String getAuthDatabase() {
        if (authDatabase == null) {
            String cmdVar = System.getProperty("mongodb.auth.database");
            String envVar = System.getenv("MONGODB_AUTH_DATABASE");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                authDatabase = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                authDatabase = envVar;
            } else {
                authDatabase = DEFAULT_AUTH_DATABASE;
            }
            log.info("MONGODB_AUTH_DATABASE: {}", authDatabase);
        }
        return authDatabase;
    }
}
