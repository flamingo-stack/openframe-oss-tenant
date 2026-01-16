package com.openframe.data.testData;

import com.openframe.data.dto.organization.AddressDto;
import com.openframe.data.dto.organization.ContactInformationDto;
import com.openframe.data.dto.organization.ContactPersonDto;
import com.openframe.data.dto.request.CreateOrganizationRequest;
import net.datafaker.Faker;

import java.time.LocalDate;
import java.util.List;


public class OrganizationDataGenerator {
    private static final Faker faker = new Faker();
    private static final String regexTemplate = "[^a-zA-Z0-9]";

    public static CreateOrganizationRequest createOrganizationRequest() {
        AddressDto physicalAddress = AddressDto.builder()
                .street1(faker.address().streetAddress())
                .street2(faker.address().secondaryAddress())
                .city(faker.address().city())
                .state(faker.address().state())
                .postalCode(faker.address().postcode())
                .country(faker.address().country())
                .build();
        ContactPersonDto contact = ContactPersonDto.builder()
                .contactName(faker.name().fullName())
                .title("CEO")
                .email(faker.internet().emailAddress())
                .phone(faker.phoneNumber().phoneNumber())
                .build();
        ContactInformationDto contactInformation = ContactInformationDto.builder()
                .physicalAddress(physicalAddress)
                .mailingAddressSameAsPhysical(true)
                .contacts(List.of(contact))
                .build();
        return CreateOrganizationRequest.builder()
                .name("Tech Solutions Inc")
                .category("Software Development")
                .numberOfEmployees(25)
                .websiteUrl("https://techsolutions.com")
                .monthlyRevenue("50000.00")
                .contractStartDate(LocalDate.now())
                .contractEndDate(LocalDate.now().plusYears(1))
                .contactInformation(contactInformation)
                .notes("Premier client with annual contract")
                .build();
    }

    public static CreateOrganizationRequest updateOrganizationRequest() {
        AddressDto physicalAddress = AddressDto.builder()
                .street1(faker.address().streetAddress())
                .street2(faker.address().secondaryAddress())
                .city(faker.address().city())
                .state(faker.address().state())
                .postalCode(faker.address().postcode())
                .country(faker.address().country())
                .build();
        AddressDto mailingAddress = AddressDto.builder()
                .street1(faker.address().streetAddress())
                .street2(faker.address().secondaryAddress())
                .city(faker.address().city())
                .state(faker.address().state())
                .postalCode(faker.address().postcode())
                .country(faker.address().country())
                .build();
        ContactPersonDto contact = ContactPersonDto.builder()
                .contactName(faker.name().fullName())
                .title("CEO")
                .email(faker.internet().emailAddress())
                .phone(faker.phoneNumber().phoneNumber())
                .build();
        ContactInformationDto contactInformation = ContactInformationDto.builder()
                .physicalAddress(physicalAddress)
                .mailingAddress(mailingAddress)
                .mailingAddressSameAsPhysical(false)
                .contacts(List.of(contact))
                .build();
        return CreateOrganizationRequest.builder()
                .name("Tech Solutions Co")
                .category("Software Solutions")
                .numberOfEmployees(22)
                .websiteUrl("https://tech-solutions.com")
                .monthlyRevenue("55000.00")
                .contractStartDate(LocalDate.now().plusMonths(1))
                .contractEndDate(LocalDate.now().plusMonths(7))
                .contactInformation(contactInformation)
                .notes("Premier client with semi-annual contract")
                .build();
    }
}
