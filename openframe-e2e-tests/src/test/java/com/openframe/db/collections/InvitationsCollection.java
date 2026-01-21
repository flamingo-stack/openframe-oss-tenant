package com.openframe.db.collections;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.openframe.data.dto.invitation.Invitation;
import com.openframe.data.dto.invitation.InvitationStatus;

import static com.openframe.db.MongoDB.getDatabase;

public class InvitationsCollection {

    private static final String COLLECTION = "invitations";

    public static Invitation findInvitation(String email) {
        return getTypedCollection().find(Filters.eq("email", email)).first();
    }

    public static Invitation findInvitation(InvitationStatus status) {
        return getTypedCollection().find(Filters.eq("status", status)).first();
    }

    private static MongoCollection<Invitation> getTypedCollection() {
        return getDatabase().getCollection(COLLECTION, Invitation.class);
    }
}
