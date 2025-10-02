package com.openframe.data;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.openframe.data.dto.UserDocument;
import com.openframe.tests.restapi.ApiBaseTest;
import org.bson.Document;

/**
 * Database query utility for API tests
 * Uses shared MongoDB connection from ApiBaseTest (thread-safe)
 */
public class DBQuery {

    /**
     * Get MongoDB database instance
     * Thread-safe: MongoDB Java Driver connection pool handles concurrency
     */
    private static MongoDatabase getDatabase() {
        return ApiBaseTest.getMongoConnection().getDatabase();
    }

    public static UserDocument findUserByEmail(String email) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        Document doc = users.find(new Document("email", email)).first();
        return UserDocument.fromDocument(doc);
    }

    public static long getUserCount() {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.countDocuments();
    }

    public static long getUserCountByTenant(String tenantName) {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        Document tenant = tenants.find(new Document("name", tenantName)).first();
        if (tenant == null) {
            return 0;
        }
        String tenantId = tenant.getString("_id");
        
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.countDocuments(new Document("tenantId", tenantId));
    }

    public static UserDocument findUserByTenantName(String tenantName) {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        Document tenant = tenants.find(new Document("name", tenantName)).first();
        if (tenant == null) {
            return null;
        }
        String tenantId = tenant.getString("_id");
        
        MongoCollection<Document> users = getDatabase().getCollection("users");
        Document doc = users.find(new Document("tenantId", tenantId)).first();
        return UserDocument.fromDocument(doc);
    }

    public static void clearAllUsers() {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        long deletedCount = users.deleteMany(new Document()).getDeletedCount();
        System.out.println("Cleared " + deletedCount + " users from database");
    }

    public static void clearAllTenants() {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        long deletedCount = tenants.deleteMany(new Document()).getDeletedCount();
        System.out.println("Cleared " + deletedCount + " tenants from database");
    }

    public static void clearAllData() {
        clearAllUsers();
        clearAllTenants();
        System.out.println("Database cleared - all users and tenants removed");
    }

    public static long getTenantCount() {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        return tenants.countDocuments();
    }
}