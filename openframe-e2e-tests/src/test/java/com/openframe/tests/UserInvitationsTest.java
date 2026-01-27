package com.openframe.tests;

import com.openframe.data.dto.invitation.*;
import com.openframe.data.dto.user.AuthUser;
import com.openframe.tests.base.AuthorizedTest;
import org.junit.jupiter.api.*;

import java.time.temporal.ChronoUnit;

import static com.openframe.api.InvitationApi.*;
import static com.openframe.api.UserApi.deleteUser;
import static com.openframe.data.generator.InvitationGenerator.*;
import static com.openframe.db.collections.InvitationsCollection.findInvitation;
import static com.openframe.db.collections.UsersCollection.findUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@Tag("authorized")
@DisplayName("Invitations and Users")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserInvitationsTest extends AuthorizedTest {

    @Order(1)
    @Test
    @DisplayName("Invite New user")
    public void testInviteUser() {
        InvitationRequest invitationRequest = newUserInvitationRequest();
        Invitation apiInvitation = inviteUser(invitationRequest);
        Invitation dbInvitation = findInvitation(invitationRequest.getEmail());
        assertThat(dbInvitation).as("No invitation found in DB").isNotNull();
        assertThat(apiInvitation).usingRecursiveComparison()
                .ignoringFields("updatedAt", "expiresAt", "createdAt").isEqualTo(dbInvitation);
        assertThat(apiInvitation.getCreatedAt()).isCloseTo(dbInvitation.getCreatedAt(), within(1, ChronoUnit.SECONDS));
        assertThat(apiInvitation.getExpiresAt()).isCloseTo(dbInvitation.getExpiresAt(), within(1, ChronoUnit.SECONDS));
    }

    @Order(2)
    @Test
    @DisplayName("Accept Invitation")
    public void testAcceptInvitation() {
        Invitation dbInvitation = findInvitation(InvitationStatus.PENDING);
        assertThat(dbInvitation).as("No Pending invitation found in DB").isNotNull();
        AcceptInvitationRequest request = acceptInvitationRequest(dbInvitation);
        AcceptInvitationResponse response = acceptInvitation(request);
        assertThat(response.getEmail()).isEqualTo(dbInvitation.getEmail());
    }

    @Order(3)
    @Test
    @DisplayName("Check that already Accepted Invitation cannot be accepted")
    public void testAcceptAcceptedInvitation() {
        Invitation dbInvitation = findInvitation(InvitationStatus.ACCEPTED);
        assertThat(dbInvitation).as("No Accepted invitation found in DB").isNotNull();
        AcceptInvitationRequest request = acceptInvitationRequest(dbInvitation);
        InvitationConflictResponse expectedResponse = alreadyAcceptedResponse();
        InvitationConflictResponse response = attemptAcceptInvitation(request);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(4)
    @Test
    @DisplayName("Revoke Invitation")
    public void testRevokeInvitation() {
        InvitationRequest invitationRequest = newUserInvitationRequest();
        Invitation apiInvitation = inviteUser(invitationRequest);
        revokeInvitation(apiInvitation.getId());
        Invitation dbInvitation = findInvitation(invitationRequest.getEmail());
        assertThat(dbInvitation).as("No invitation found in DB").isNotNull();
        assertThat(dbInvitation.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    @Order(5)
    @Test
    @DisplayName("Check that Revoked Invitation cannot be accepted")
    public void testAcceptRevokedInvitation() {
        Invitation dbInvitation = findInvitation(InvitationStatus.REVOKED);
        assertThat(dbInvitation).as("No Revoked invitation found in DB").isNotNull();
        AcceptInvitationRequest request = acceptInvitationRequest(dbInvitation);
        InvitationConflictResponse expectedResponse = invitationRevokedResponse();
        InvitationConflictResponse response = attemptAcceptInvitation(request);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(6)
    @Test
    @DisplayName("Check that Existing User cannot be invited")
    public void testInviteActiveUser() {
        AuthUser activeUser = findUser(UserStatus.ACTIVE);
        assertThat(activeUser).as("User is not found in DB").isNotNull();
        InvitationRequest invitationRequest = existingUserInvitationRequest(activeUser);
        InvitationConflictResponse expectedResponse = userAlreadyExistsResponse(activeUser);
        InvitationConflictResponse response = attemptInviteUser(invitationRequest);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(7)
    @Test
    @DisplayName("Delete Admin User")
    public void testDeleteUser() {
        AuthUser user = findUser(UserStatus.ACTIVE);
        assertThat(user).as("User is not found in DB").isNotNull();
        int statusCode = deleteUser(user.getId());
        user = findUser(user.getId());
        assertThat(statusCode).isEqualTo(204);
        assertThat(user).as("User is not found in DB").isNotNull();
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
    }

    @Order(8)
    @Test
    @DisplayName("Check that Owner User cannot be deleted")
    public void testDeleteOwner() {
        AuthUser user = findUser(UserRole.OWNER);
        assertThat(user).as("User is not found in DB").isNotNull();
        int statusCode = deleteUser(user.getId());
        user = findUser(user.getId());
        assertThat(statusCode).isEqualTo(409);
        assertThat(user).as("User is not found in DB").isNotNull();
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Order(9)
    @Test
    @DisplayName("Check that Deleted User can be invited")
    public void testInviteDeletedUser() {
        AuthUser deletedUser = findUser(UserStatus.DELETED);
        assertThat(deletedUser).as("User is not found in DB").isNotNull();
        InvitationRequest invitationRequest = existingUserInvitationRequest(deletedUser);
        Invitation apiInvitation = inviteUser(invitationRequest);
        assertThat(apiInvitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(apiInvitation.getEmail()).isEqualTo(deletedUser.getEmail());
    }
}
