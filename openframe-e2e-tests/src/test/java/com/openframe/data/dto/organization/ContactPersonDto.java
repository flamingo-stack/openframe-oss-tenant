package com.openframe.data.dto.organization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for contact person information.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ContactPersonDto {
    String contactName;
    String title;
    String phone;
    String email;
}