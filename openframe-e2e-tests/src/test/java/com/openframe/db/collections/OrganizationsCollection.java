package com.openframe.db.collections;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Projections;
import com.openframe.data.dto.organization.Organization;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.ArrayList;
import java.util.List;

import static com.openframe.db.MongoDB.getDatabase;

public class OrganizationsCollection {

    private static final String COLLECTION = "organizations";

    public static Organization findOrganization(String id) {
        return getTypedCollection().find(Filters.eq("_id", new ObjectId(id))).first();
    }

    public static Organization findOrganization(boolean deleted, boolean isDefault) {
        return getTypedCollection()
                .find(Filters.and(
                        Filters.eq("deleted", deleted),
                        Filters.eq("isDefault", isDefault)
                )).first();
    }

    public static List<String> findOrganizationIds(boolean deleted) {
        List<String> ids = new ArrayList<>();
        getCollection()
                .find(Filters.eq("deleted", deleted))
                .projection(Projections.include("_id"))
                .map(doc -> doc.getObjectId("_id").toHexString())
                .into(ids);
        return ids;
    }

    private static MongoCollection<Organization> getTypedCollection() {
        return getDatabase().getCollection(COLLECTION, Organization.class);
    }

    private static MongoCollection<Document> getCollection() {
        return getDatabase().getCollection(COLLECTION);
    }
}
