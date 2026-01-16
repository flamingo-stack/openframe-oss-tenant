package com.openframe.data.dataProviders;

import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

import static com.openframe.data.testData.OrganizationDataGenerator.createOrganizationRequest;
import static com.openframe.data.testData.OrganizationDataGenerator.updateOrganizationRequest;

public class OrganizationDataProvider {

    public static Stream<Arguments> createOrganization() {
        return Stream.of(Arguments.of(createOrganizationRequest()));
    }

    public static Stream<Arguments> updateOrganization() {
        return Stream.of(Arguments.of(updateOrganizationRequest()));
    }
}
