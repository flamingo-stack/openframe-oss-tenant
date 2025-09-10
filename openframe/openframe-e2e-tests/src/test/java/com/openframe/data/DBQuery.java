package com.openframe.data;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.openframe.config.MongoDBConnection;
import com.openframe.config.ThreadSafeTestContext;
import com.openframe.data.dto.UserDocument;
import com.openframe.data.dto.TenantDocument;
import org.bson.Document;

public class DBQuery {

    private static MongoDatabase getDatabase() {
        MongoDBConnection mongoConnection = ThreadSafeTestContext.getData("mongo_connection");
        if (mongoConnection == null) {
            throw new IllegalStateException("MongoDB connection not found in test context");
        }
        return mongoConnection.getDatabase();
    }

    public static void deleteUserById(String userId) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        users.deleteOne(new Document("_id", userId));
        System.out.println("User с id " + userId + " удалён.");
    }

    public static boolean userExists(String userId) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        Document user = users.find(new Document("_id", userId)).first();
        return user != null;
    }

    public static boolean testConnection() {
        try {
            getDatabase().listCollectionNames().first();
            return true;
        } catch (Exception e) {
            System.err.println("MongoDB connection test failed: " + e.getMessage());
            return false;
        }
    }

    public static Document findUserByEmail(String email) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.find(new Document("email", email)).first();
    }

    /**
     * Find user by email and return as DTO
     */
    public static UserDocument findUserByEmailAsDto(String email) {
        Document doc = findUserByEmail(email);
        return UserDocument.fromDocument(doc);
    }

    public static String getUserStatus(String email) {
        Document user = findUserByEmail(email);
        if (user == null) return null;
        return user.getString("status");
    }

    public static boolean deleteUserByEmail(String email) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.deleteOne(new Document("email", email)).getDeletedCount() > 0;
    }

    public static Document getUserById(String userId) {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.find(new Document("_id", userId)).first();
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
    
    public static Document findUserByTenantName(String tenantName) {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        Document tenant = tenants.find(new Document("name", tenantName)).first();
        if (tenant == null) {
            return null;
        }
        String tenantId = tenant.getString("_id");
        
        MongoCollection<Document> users = getDatabase().getCollection("users");
        return users.find(new Document("tenantId", tenantId)).first();
    }

    /**
     * Find user by tenant name and return as DTO
     */
    public static UserDocument findUserByTenantNameAsDto(String tenantName) {
        Document doc = findUserByTenantName(tenantName);
        return UserDocument.fromDocument(doc);
    }

    public static String getTenantIdByTenantName(String tenantName) {
        Document user = findUserByTenantName(tenantName);
        if (user != null) {
            return user.getString("tenantId");
        }
        return null;
    }

    public static String getUserIdByTenantName(String tenantName) {
        Document user = findUserByTenantName(tenantName);
        if (user != null) {
            return user.getString("_id");
        }
        return null;
    }

    /**
     * Get both user ID and tenant ID in one query (optimized)
     */
    public static UserIds getIdsByTenantName(String tenantName) {
        UserDocument user = findUserByTenantNameAsDto(tenantName);
        if (user != null) {
            return new UserIds(user.getId(), user.getTenantId());
        }
        return null;
    }

    /**
         * Helper class for returning multiple IDs
         */
        public record UserIds(String userId, String tenantId) {
    }

    public static boolean deleteTenant(String tenantId) {
        if (tenantId == null) return false;
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        return tenants.deleteOne(new Document("_id", tenantId)).getDeletedCount() > 0;
    }

    /**
     * Find tenant by name and return as DTO
     */
    public static TenantDocument findTenantByNameAsDto(String tenantName) {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        Document doc = tenants.find(new Document("name", tenantName)).first();
        return TenantDocument.fromDocument(doc);
    }

    /**
     * Find tenant by ID and return as DTO
     */
    public static TenantDocument findTenantByIdAsDto(String tenantId) {
        MongoCollection<Document> tenants = getDatabase().getCollection("tenants");
        Document doc = tenants.find(new Document("_id", tenantId)).first();
        return TenantDocument.fromDocument(doc);
    }

    public static void printAllUsers() {
        MongoCollection<Document> users = getDatabase().getCollection("users");
        for (Document user : users.find()) {
            System.out.println("User document: " + user.toJson());
        }
    }
}
