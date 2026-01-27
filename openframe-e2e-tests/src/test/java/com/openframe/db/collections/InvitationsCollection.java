package com.openframe.db.collections;

import com.mongodb.client.model.Filters;
import com.openframe.data.dto.invitation.Invitation;
import com.openframe.data.dto.invitation.InvitationStatus;

import static com.openframe.db.MongoDB.getCollection;

public class InvitationsCollection {

    public static Invitation findInvitation(String email) {
        return getCollection("invitations", Invitation.class).find(Filters.eq("email", email)).first();
    }

    public static Invitation findInvitation(InvitationStatus status) {
        return getCollection("invitations", Invitation.class).find(Filters.eq("status", status)).first();
    }

}
