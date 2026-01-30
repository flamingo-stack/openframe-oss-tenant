package com.openframe.data.generator;

import com.openframe.data.dto.invitation.AcceptInvitationRequest;
import com.openframe.data.dto.invitation.Invitation;
import com.openframe.data.dto.invitation.InvitationConflictResponse;
import com.openframe.data.dto.invitation.InvitationRequest;
import com.openframe.data.dto.user.AuthUser;
import net.datafaker.Faker;

import static com.openframe.config.UserConfig.CORRECT_PASSWORD;

public class InvitationGenerator {

    private static final Faker faker = new Faker();

    public static InvitationRequest newUserInvitationRequest() {
        return InvitationRequest.builder().email(faker.internet().emailAddress()).build();
    }

    public static InvitationRequest existingUserInvitationRequest(AuthUser user) {
        return InvitationRequest.builder().email(user.getEmail()).build();
    }

    public static AcceptInvitationRequest acceptInvitationRequest(Invitation invitation) {
        return AcceptInvitationRequest.builder()
                .invitationId(invitation.getId())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .build();
    }

    public static InvitationConflictResponse alreadyAcceptedResponse() {
        return InvitationConflictResponse.builder()
                .code("CONFLICT")
                .message("Invitation already used or revoked")
                .build();
    }

    public static InvitationConflictResponse invitationRevokedResponse() {
        return alreadyAcceptedResponse();
    }

    public static InvitationConflictResponse userAlreadyExistsResponse(AuthUser user) {
        return InvitationConflictResponse.builder()
                .code("CONFLICT")
                .message("User with email %s already exists in tenant".formatted(user.getEmail()))
                .build();
    }
}
