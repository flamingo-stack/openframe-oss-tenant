package com.openframe.db;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoCredential;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.codecs.configuration.CodecProvider;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;

import static com.mongodb.MongoClientSettings.getDefaultCodecRegistry;
import static com.openframe.config.MongoConfig.*;
import static org.bson.codecs.configuration.CodecRegistries.fromProviders;
import static org.bson.codecs.configuration.CodecRegistries.fromRegistries;

public class MongoDB {

    private static ThreadLocal<MongoClient> mongoClient;
    private static ThreadLocal<MongoDatabase> database;

    public static MongoDatabase getDatabase() {
        openConnection();
        if (database == null) {
            CodecProvider pojoCodecProvider = PojoCodecProvider.builder().automatic(true).build();
            CodecRegistry pojoCodecRegistry = fromRegistries(getDefaultCodecRegistry(), fromProviders(pojoCodecProvider));
            database = new ThreadLocal<>();
            database.set(mongoClient.get().getDatabase(getDatabaseName()).withCodecRegistry(pojoCodecRegistry));
        }
        return database.get();
    }

    public static <T> MongoCollection<T> getCollection(String name, Class<T> docClass) {
        return getDatabase().getCollection(name, docClass);
    }

    public static void openConnection() {
        if (mongoClient == null) {
            mongoClient = new ThreadLocal<>();

            MongoCredential credential = MongoCredential.createCredential(
                    getMongoUser(),
                    getAuthDatabase(),
                    getMongoPassword().toCharArray()
            );

            MongoClientSettings settings = MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(getMongoDbUri()))
                    .credential(credential)
                    .build();

            mongoClient.set(MongoClients.create(settings));
        }
    }

    public static void closeConnection() {
        if (mongoClient != null && mongoClient.get() != null) {
            mongoClient.get().close();
        }
        mongoClient = null;
        database = null;
    }

}
