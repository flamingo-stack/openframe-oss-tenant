package com.openframe.db.collections;

import com.mongodb.client.model.Filters;
import com.openframe.data.dto.organization.Organization;
import org.bson.types.ObjectId;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static com.openframe.db.MongoDB.getCollection;

public class OrganizationsCollection {

    public static Organization findOrganization(String id) {
        return getCollection("organizations", Organization.class).find(Filters.eq("_id", new ObjectId(id))).first();
    }

    public static Organization findOrganization(boolean deleted, boolean isDefault) {
        return getCollection("organizations", Organization.class)
                .find(Filters.and(
                        Filters.eq("deleted", deleted),
                        Filters.eq("isDefault", isDefault)
                )).first();
    }

    public static List<String> findOrganizationIds(boolean deleted) {
        List<Organization> organizations = new ArrayList<>();
        getCollection("organizations", Organization.class)
                .find(Filters.eq("deleted", deleted))
                .into(organizations);
        return organizations.stream().map(Organization::getId).collect(Collectors.toList());
    }

}
