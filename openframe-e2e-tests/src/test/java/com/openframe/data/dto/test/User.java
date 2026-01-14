package com.openframe.data.dto.test;

import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.RegistrationResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
    private String id;
    private String email;
    private String password;
    private String tenantId;
    private String displayName;
    private List<String> roles;

    public static User fromRegistration(UserRegistrationRequest request, RegistrationResponse response) {
        String[] parts = request.getEmail().split("@");
        return User.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .tenantId(response.getId())
                .displayName(parts[0])
                .roles(List.of("OWNER", "ADMIN"))
                .build();
    }
}
