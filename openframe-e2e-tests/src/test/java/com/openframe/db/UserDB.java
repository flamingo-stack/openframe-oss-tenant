package com.openframe.db;

import com.mongodb.client.model.Filters;
import com.openframe.data.dto.db.AuthUser;
import com.openframe.data.dto.invitation.UserStatus;

import static com.openframe.db.MongoDB.getDatabase;

public class UserDB {

    public static AuthUser getFirstUser() {
        return getDatabase().getCollection("users", AuthUser.class).find().first();
    }

    public static AuthUser getUser(UserStatus status) {
        return getDatabase().getCollection("users", AuthUser.class)
                .find(Filters.and(Filters.eq("status", status), Filters.nin("roles", "OWNER"))).first();
    }

    public static AuthUser getOwnerUser() {
        return getDatabase().getCollection("users", AuthUser.class)
                .find(Filters.in("roles", "OWNER")).first();
    }

}
