package com.openframe.db;

import com.openframe.data.dto.db.AuthUser;

import static com.openframe.db.MongoDB.getDatabase;

public class UserDB {

    public static AuthUser getFirstUser() {
        return getDatabase().getCollection("users", AuthUser.class).find().first();
    }

}
