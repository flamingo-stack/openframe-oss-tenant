package com.openframe.db.collections;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.openframe.data.dto.invitation.UserRole;
import com.openframe.data.dto.invitation.UserStatus;
import com.openframe.data.dto.user.AuthUser;

import static com.openframe.db.MongoDB.getDatabase;

public class UsersCollection {

    private static final String COLLECTION = "users";

    public static AuthUser findUser() {
        return getTypedCollection().find().first();
    }

    public static AuthUser findUser(String id) {
        return getTypedCollection().find(Filters.eq("_id", id)).first();
    }

    public static AuthUser findUser(UserStatus status) {
        return findUser(status, UserRole.ADMIN);
    }

    public static AuthUser findUser(UserRole role) {
        return findUser(UserStatus.ACTIVE, role);
    }

    public static AuthUser findUser(UserStatus status, UserRole role) {
        return getTypedCollection()
                .find(Filters.and(
                        Filters.eq("status", status),
                        Filters.in("roles", role)
                )).first();
    }

    private static MongoCollection<AuthUser> getTypedCollection() {
        return getDatabase().getCollection(COLLECTION, AuthUser.class);
    }
}
