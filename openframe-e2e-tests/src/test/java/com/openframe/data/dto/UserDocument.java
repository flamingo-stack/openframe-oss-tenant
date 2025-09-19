package com.openframe.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDocument {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String status;
    private String tenantId;
    private String tenantDomain;
    private String passwordHash;
    private String loginProvider;
    private Boolean emailVerified;
    private List<String> roles;

    public static UserDocument fromDocument(Document doc) {
        if (doc == null) return null;
        
        return UserDocument.builder()
                .id(doc.getString("_id"))
                .email(doc.getString("email"))
                .firstName(doc.getString("firstName"))
                .lastName(doc.getString("lastName"))
                .status(doc.getString("status"))
                .tenantId(doc.getString("tenantId"))
                .tenantDomain(doc.getString("tenantDomain"))
                .passwordHash(doc.getString("passwordHash"))
                .loginProvider(doc.getString("loginProvider"))
                .emailVerified(doc.getBoolean("emailVerified"))
                .roles(doc.getList("roles", String.class))
                .build();
    }
}

