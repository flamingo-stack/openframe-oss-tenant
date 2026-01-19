package com.openframe.db;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Projections;
import com.openframe.data.dto.organization.Organization;
import org.bson.types.ObjectId;

import java.util.ArrayList;
import java.util.List;

import static com.openframe.db.MongoDB.getDatabase;

public class OrganizationDB {

    public static Organization getOrganization(String id) {
        return getDatabase().getCollection("organizations", Organization.class)
                .find(Filters.eq("_id", new ObjectId(id))).first();
    }

    public static Organization getDefaultOrganization() {
        return getDatabase().getCollection("organizations", Organization.class)
                .find(Filters.eq("isDefault", true)).first();
    }

    public static Organization getNotDefaultOrganization() {
        return getDatabase().getCollection("organizations", Organization.class)
                .find(Filters.and(
                        Filters.eq("deleted", false),
                        Filters.eq("isDefault", false)
                )).first();
    }

    public static List<String> getActiveOrganizationIds() {
        List<String> ids = new ArrayList<>();
        getDatabase().getCollection("organizations")
                .find(Filters.eq("deleted", false))
                .projection(Projections.include("_id"))
                .map(doc -> doc.getObjectId("_id").toHexString())
                .into(ids);
        return ids;
    }

    public static List<String> getDeletedOrganizationIds() {
        List<String> ids = new ArrayList<>();
        getDatabase().getCollection("organizations")
                .find(Filters.eq("deleted", true))
                .projection(Projections.include("_id"))
                .map(doc -> doc.getObjectId("_id").toHexString())
                .into(ids);
        return ids;
    }
}
