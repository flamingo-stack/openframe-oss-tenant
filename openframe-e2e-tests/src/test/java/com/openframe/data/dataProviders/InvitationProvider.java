package com.openframe.data.dataProviders;

import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

import static com.openframe.data.testData.InvitationGenerator.getUserInvitation;

public class InvitationProvider {

    public static Stream<Arguments> inviteUser() {
        return Stream.of(Arguments.of(getUserInvitation()));
    }

}
