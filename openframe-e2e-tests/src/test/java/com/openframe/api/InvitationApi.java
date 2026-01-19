package com.openframe.api;

import com.openframe.data.dto.invitation.*;

import static com.openframe.support.helpers.RequestSpecHelper.getAuthorizedSpec;
import static com.openframe.support.helpers.RequestSpecHelper.getUnAuthorizedSpec;
import static io.restassured.RestAssured.given;

public class InvitationApi {

    private static final String INVITATIONS = "/api/invitations";
    private static final String ACCEPT = "/sas/invitations/accept";

    public static Invitation inviteUser(InvitationRequest request) {
        return given(getAuthorizedSpec())
                .body(request)
                .post(INVITATIONS)
                .then().statusCode(201)
                .extract().as(Invitation.class);
    }

    public static InvitationConflictResponse attemptInviteUser(InvitationRequest request) {
        return given(getAuthorizedSpec())
                .body(request)
                .post(INVITATIONS)
                .then().statusCode(409)
                .extract().as(InvitationConflictResponse.class);
    }

    public static AcceptInvitationResponse acceptInvitation(AcceptInvitationRequest request) {
        return given(getUnAuthorizedSpec())
                .body(request)
                .post(ACCEPT)
                .then().statusCode(200)
                .extract().as(AcceptInvitationResponse.class);
    }

    public static InvitationConflictResponse attemptAcceptInvitation(AcceptInvitationRequest request) {
        return given(getUnAuthorizedSpec())
                .body(request)
                .post(ACCEPT)
                .then().statusCode(409)
                .extract().as(InvitationConflictResponse.class);
    }

    public static void revokeInvitation(String invitationId) {
        final String REVOKE_INVITATION = INVITATIONS.concat("/").concat(invitationId);
        given(getAuthorizedSpec())
                .delete(REVOKE_INVITATION)
                .then().statusCode(204);
    }
}
