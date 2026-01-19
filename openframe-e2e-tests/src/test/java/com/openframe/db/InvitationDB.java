package com.openframe.db;

import com.mongodb.client.model.Filters;
import com.openframe.data.dto.invitation.Invitation;
import com.openframe.data.dto.invitation.InvitationStatus;

import static com.openframe.db.MongoDB.getDatabase;

public class InvitationDB {

    public static Invitation getInvitation(String email) {
        return getDatabase().getCollection("invitations", Invitation.class)
                .find(Filters.eq("email", email)).first();
    }

    public static Invitation getInvitation(InvitationStatus status) {
        return getDatabase().getCollection("invitations", Invitation.class)
                .find(Filters.eq("status", status)).first();
    }
}
