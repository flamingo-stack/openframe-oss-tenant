package com.openframe.api.mapper;

import com.openframe.api.dto.user.UserResponse;
import com.openframe.data.document.user.User;
import org.springframework.stereotype.Component;


@Component
public class UserMapper {
    public UserResponse toResponse(User entity) {
        return UserResponse.builder()
                .id(entity.getId())
                .email(entity.getEmail())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .roles(entity.getRoles().stream().map(Enum::name).toList())
                .status(entity.getStatus().name())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}


