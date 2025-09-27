package com.openframe.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationRegistrationData {
    private String organizationName;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String confirmPassword;
    

    public OrganizationRegistrationData(String organizationName, String firstName, 
                                      String lastName, String email, String password) {
        this.organizationName = organizationName;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.confirmPassword = password;
    }

    public boolean isValid() {
        return organizationName != null && !organizationName.trim().isEmpty() &&
               firstName != null && !firstName.trim().isEmpty() &&
               lastName != null && !lastName.trim().isEmpty() &&
               email != null && !email.trim().isEmpty() && email.contains("@") &&
               password != null && password.length() >= 8 &&
               password.equals(confirmPassword);
    }
    
    @Override
    public String toString() {
        return "OrganizationRegistrationData{" +
                "organizationName='" + organizationName + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", email='" + email + '\'' +
                ", password='[HIDDEN]'" +
                '}';
    }
}

