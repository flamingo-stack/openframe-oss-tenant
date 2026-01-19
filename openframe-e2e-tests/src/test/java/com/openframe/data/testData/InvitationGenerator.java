package com.openframe.data.testData;

import com.openframe.data.dto.db.AuthUser;
import com.openframe.data.dto.invitation.AcceptInvitationRequest;
import com.openframe.data.dto.invitation.Invitation;
import com.openframe.data.dto.invitation.InvitationConflictResponse;
import com.openframe.data.dto.invitation.InvitationRequest;
import net.datafaker.Faker;

import static com.openframe.support.constants.TestConstants.CORRECT_PASSWORD;

public class InvitationGenerator {

    private static final Faker faker = new Faker();

    public static InvitationRequest getUserInvitation() {
        return InvitationRequest.builder().email(faker.internet().emailAddress()).build();
    }

    public static InvitationRequest getExistingUserInvitation(AuthUser user) {
        return InvitationRequest.builder().email(user.getEmail()).build();
    }

    public static AcceptInvitationRequest getInvitationAccept(Invitation invitation) {
        return AcceptInvitationRequest.builder()
                .invitationId(invitation.getId())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .build();
    }

    public static InvitationConflictResponse getInvitationAlreadyAccepted() {
        return InvitationConflictResponse.builder()
                .code("CONFLICT")
                .message("Invitation already used or revoked")
                .build();
    }

    public static InvitationConflictResponse getUserAlreadyExists(AuthUser user) {
        return InvitationConflictResponse.builder()
                .code("CONFLICT")
                .message("User with email %s already exists in tenant".formatted(user.getEmail()))
                .build();
    }

//    {
//        "code" : "CONFLICT",
//            "message" : "User with email veta.mcglynn@gmail.com already exists in tenant"
//    }
}
