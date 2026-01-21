package com.openframe.data.generator;

import com.openframe.data.dto.organization.AddressDto;
import com.openframe.data.dto.organization.ContactInformationDto;
import com.openframe.data.dto.organization.ContactPersonDto;
import com.openframe.data.dto.organization.CreateOrganizationRequest;
import net.datafaker.Faker;

import java.time.LocalDate;
import java.util.List;


public class OrganizationGenerator {
    private static final Faker faker = new Faker();

    public static CreateOrganizationRequest createOrganizationRequest(boolean mailingAddressSameAsPhysical) {
        return CreateOrganizationRequest.builder()
                .name("Tech Solutions Inc")
                .category("Software Development")
                .numberOfEmployees(25)
                .websiteUrl("https://techsolutions.com")
                .monthlyRevenue("50000.00")
                .contractStartDate(LocalDate.now())
                .contractEndDate(LocalDate.now().plusYears(1))
                .contactInformation(contactInformation(mailingAddressSameAsPhysical))
                .notes("Premier client with annual contract")
                .build();
    }

    public static CreateOrganizationRequest updateOrganizationRequest(boolean mailingAddressSameAsPhysical) {
        return CreateOrganizationRequest.builder()
                .name("Tech Solutions Co")
                .category("Software Solutions")
                .numberOfEmployees(22)
                .websiteUrl("https://tech-solutions.com")
                .monthlyRevenue("55000.00")
                .contractStartDate(LocalDate.now().plusMonths(1))
                .contractEndDate(LocalDate.now().plusMonths(7))
                .contactInformation(contactInformation(mailingAddressSameAsPhysical))
                .notes("Premier client with semi-annual contract")
                .build();
    }

    private static ContactInformationDto contactInformation(boolean mailingAddressSameAsPhysical) {
        ContactInformationDto.ContactInformationDtoBuilder builder = ContactInformationDto.builder()
                .physicalAddress(address())
                .mailingAddressSameAsPhysical(mailingAddressSameAsPhysical)
                .contacts(List.of(contactPerson()));
        if (!mailingAddressSameAsPhysical) {
            builder.mailingAddress(address());
        }
        return builder.build();
    }

    private static AddressDto address() {
        return AddressDto.builder()
                .street1(faker.address().streetAddress())
                .street2(faker.address().secondaryAddress())
                .city(faker.address().city())
                .state(faker.address().state())
                .postalCode(faker.address().postcode())
                .country(faker.address().country())
                .build();
    }

    private static ContactPersonDto contactPerson() {
        return ContactPersonDto.builder()
                .contactName(faker.name().fullName())
                .title("CEO")
                .email(faker.internet().emailAddress())
                .phone(faker.phoneNumber().phoneNumber())
                .build();
    }
}
