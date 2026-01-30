package com.openframe.db.collections;

import com.mongodb.client.model.Filters;
import com.openframe.data.dto.invitation.UserRole;
import com.openframe.data.dto.invitation.UserStatus;
import com.openframe.data.dto.user.AuthUser;

import static com.openframe.db.MongoDB.getCollection;

public class UsersCollection {

    public static AuthUser findUser() {
        return getCollection("users", AuthUser.class).find().first();
    }

    public static AuthUser findUser(String id) {
        return getCollection("users", AuthUser.class).find(Filters.eq("_id", id)).first();
    }

    public static AuthUser findUser(UserStatus status) {
        return findUser(status, UserRole.ADMIN);
    }

    public static AuthUser findUser(UserRole role) {
        return findUser(UserStatus.ACTIVE, role);
    }

    public static AuthUser findUser(UserStatus status, UserRole role) {
        return getCollection("users", AuthUser.class)
                .find(Filters.and(
                        Filters.eq("status", status),
                        Filters.in("roles", role)
                )).first();
    }

}
