package com.openframe.data;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.openframe.data.testData.UserDocument;
import com.openframe.tests.restapi.ApiBaseTest;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;

/**
 * Database query utility for API tests
 * Uses shared MongoDB connection from ApiBaseTest (thread-safe)
 */
@Slf4j
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
        log.info("Cleared {} users from database", deletedCount);
    }

    public static void clearAllTenants() {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        long deletedCount = tenants.deleteMany(new Document()).getDeletedCount();
        log.info("Cleared {} tenants from database", deletedCount);
    }

    public static void clearAllData() {
        clearAllUsers();
        clearAllTenants();
        log.info("Database cleared - all users and tenants removed");
    }

    public static long getTenantCount() {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        return tenants.countDocuments();
    }

    /**
     * Save or update user in MongoDB
     * @param user user document to save
     */
    public static void saveUser(UserDocument user) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        Document doc = user.toDocument();
        
        // Delete existing user with same ID if exists
        if (user.getId() != null) {
            users.deleteOne(new Document("_id", user.getId()));
        }
        
        users.insertOne(doc);
        log.info("Saved user: {}", user.getEmail());
    }
}