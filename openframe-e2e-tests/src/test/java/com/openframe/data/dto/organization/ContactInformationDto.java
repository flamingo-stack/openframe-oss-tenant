package com.openframe.data.dto.organization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for contact information including contacts and addresses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactInformationDto {
        List<ContactPersonDto> contacts;
        AddressDto physicalAddress;
        AddressDto mailingAddress;
        Boolean mailingAddressSameAsPhysical;
}

