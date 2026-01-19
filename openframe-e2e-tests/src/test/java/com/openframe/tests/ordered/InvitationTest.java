package com.openframe.tests.ordered;

import com.openframe.api.InvitationApi;
import com.openframe.api.UserApi;
import com.openframe.data.dto.db.AuthUser;
import com.openframe.data.dto.invitation.*;
import com.openframe.db.InvitationDB;
import com.openframe.db.UserDB;
import com.openframe.tests.ordered.base.AuthorizedTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.temporal.ChronoUnit;

import static com.openframe.data.testData.InvitationGenerator.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@Tag("authorized")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class InvitationTest extends AuthorizedTest {

    @Order(1)
    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.InvitationProvider#inviteUser")
    public void inviteUser(InvitationRequest invitationRequest) {
        Invitation apiInvitation = InvitationApi.inviteUser(invitationRequest);
        Invitation dbInvitation = InvitationDB.getInvitation(invitationRequest.getEmail());
        assertThat(dbInvitation).isNotNull();
        assertThat(apiInvitation).usingRecursiveComparison()
                .ignoringFields("updatedAt", "expiresAt", "createdAt").isEqualTo(dbInvitation);
        assertThat(apiInvitation.getCreatedAt()).isCloseTo(dbInvitation.getCreatedAt(), within(1, ChronoUnit.SECONDS));
        assertThat(apiInvitation.getExpiresAt()).isCloseTo(dbInvitation.getExpiresAt(), within(1, ChronoUnit.SECONDS));
    }

    @Order(2)
    @Test
    public void acceptInvitation() {
        Invitation dbInvitation = InvitationDB.getInvitation(InvitationStatus.PENDING);
        assertThat(dbInvitation).isNotNull();
        AcceptInvitationRequest acceptInvitationRequest = getInvitationAccept(dbInvitation);
        AcceptInvitationResponse response = InvitationApi.acceptInvitation(acceptInvitationRequest);
        assertThat(response.getEmail()).isEqualTo(dbInvitation.getEmail());
    }

    @Order(3)
    @Test
    public void acceptAcceptedInvitation() {
        Invitation dbInvitation = InvitationDB.getInvitation(InvitationStatus.ACCEPTED);
        assertThat(dbInvitation).isNotNull();
        AcceptInvitationRequest acceptInvitationRequest = getInvitationAccept(dbInvitation);
        InvitationConflictResponse expectedResponse = getInvitationAlreadyAccepted();
        InvitationConflictResponse response = InvitationApi.attemptAcceptInvitation(acceptInvitationRequest);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(4)
    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.InvitationProvider#inviteUser")
    public void revokeInvitation(InvitationRequest invitationRequest) {
        Invitation apiInvitation = InvitationApi.inviteUser(invitationRequest);
        InvitationApi.revokeInvitation(apiInvitation.getId());
        Invitation dbInvitation = InvitationDB.getInvitation(invitationRequest.getEmail());
        assertThat(dbInvitation).isNotNull();
        assertThat(dbInvitation.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    @Order(5)
    @Test
    public void acceptRevokedInvitation() {
        Invitation dbInvitation = InvitationDB.getInvitation(InvitationStatus.REVOKED);
        assertThat(dbInvitation).isNotNull();
        AcceptInvitationRequest acceptInvitationRequest = getInvitationAccept(dbInvitation);
        InvitationConflictResponse expectedResponse = getInvitationAlreadyAccepted();
        InvitationConflictResponse response = InvitationApi.attemptAcceptInvitation(acceptInvitationRequest);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(6)
    @Test
    public void inviteActiveUser() {
        AuthUser activeUser = UserDB.getUser(UserStatus.ACTIVE);
        InvitationRequest invitationRequest = getExistingUserInvitation(activeUser);
        InvitationConflictResponse expectedResponse = getUserAlreadyExists(activeUser);
        InvitationConflictResponse response = InvitationApi.attemptInviteUser(invitationRequest);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Order(7)
    @Test
    public void deleteUser() {
        AuthUser activeUser = UserDB.getUser(UserStatus.ACTIVE);
        int statusCode = UserApi.deleteUser(activeUser.getId());
        assertThat(statusCode).isEqualTo(204);
    }

    @Order(8)
    @Test
    public void deleteOwner() {
        AuthUser activeUser = UserDB.getOwnerUser();
        int statusCode = UserApi.deleteUser(activeUser.getId());
        assertThat(statusCode).isEqualTo(409);
    }

    @Order(9)
    @Test
    public void inviteDeletedUser() {
        AuthUser deletedUser = UserDB.getUser(UserStatus.DELETED);
        InvitationRequest invitationRequest = getExistingUserInvitation(deletedUser);
        Invitation apiInvitation = InvitationApi.inviteUser(invitationRequest);
        assertThat(apiInvitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(apiInvitation.getEmail()).isEqualTo(deletedUser.getEmail());
    }
}
