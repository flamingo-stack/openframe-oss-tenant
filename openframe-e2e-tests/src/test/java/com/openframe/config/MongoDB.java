package com.openframe.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.openframe.data.dto.db.AuthUser;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.codecs.configuration.CodecProvider;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;

import java.util.ArrayList;
import java.util.List;

import static com.openframe.support.constants.DatabaseConstants.DATABASE_NAME;
import static com.openframe.support.constants.DatabaseConstants.MONGODB_URI;
import static com.mongodb.MongoClientSettings.getDefaultCodecRegistry;
import static org.bson.codecs.configuration.CodecRegistries.fromProviders;
import static org.bson.codecs.configuration.CodecRegistries.fromRegistries;

@Slf4j
public class MongoDB {

    private static MongoClient mongoClient;
    private static MongoDatabase database;

    public static AuthUser getFirstUser() {
        List<AuthUser> users = new ArrayList<>();
        getDatabase().getCollection("users", AuthUser.class).find().into(users);
        return users.isEmpty() ? null : users.getFirst();
    }

    public static void clean() {
        MongoDatabase mongoDB = getDatabase();
        MongoCollection<Document> users = mongoDB.getCollection("users");
        long deletedUsers = users.deleteMany(new Document()).getDeletedCount();
        MongoCollection<Document> tenants = mongoDB.getCollection("tenants");
        long deletedTenants = tenants.deleteMany(new Document()).getDeletedCount();
        close();
        log.info("Cleared {} users from database", deletedUsers);
        log.info("Cleared {} tenants from database", deletedTenants);
    }

    public static void close() {
        if (mongoClient != null) {
            mongoClient.close();
            mongoClient = null;
        }
    }

    private static MongoDatabase getDatabase() {
        if (mongoClient == null) {
            mongoClient = MongoClients.create(MONGODB_URI);
            CodecProvider pojoCodecProvider = PojoCodecProvider.builder().automatic(true).build();
            CodecRegistry pojoCodecRegistry = fromRegistries(getDefaultCodecRegistry(), fromProviders(pojoCodecProvider));
            database = mongoClient.getDatabase(DATABASE_NAME).withCodecRegistry(pojoCodecRegistry);
        }
        return database;
    }
}
