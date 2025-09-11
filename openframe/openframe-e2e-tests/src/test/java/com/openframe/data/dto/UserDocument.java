package com.openframe.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.Document;

import java.util.List;

/**
 * DTO for User document from MongoDB
 * Provides type-safe access to user fields
 */
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
    private String authProvider;
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
                .authProvider(doc.getString("authProvider"))
                .emailVerified(doc.getBoolean("emailVerified"))
                .roles(doc.getList("roles", String.class))
                .build();
    }

    public Document toDocument() {
        Document doc = new Document();
        if (id != null) doc.append("_id", id);
        if (email != null) doc.append("email", email);
        if (firstName != null) doc.append("firstName", firstName);
        if (lastName != null) doc.append("lastName", lastName);
        if (status != null) doc.append("status", status);
        if (tenantId != null) doc.append("tenantId", tenantId);
        if (tenantDomain != null) doc.append("tenantDomain", tenantDomain);
        if (passwordHash != null) doc.append("passwordHash", passwordHash);
        if (authProvider != null) doc.append("authProvider", authProvider);
        if (emailVerified != null) doc.append("emailVerified", emailVerified);
        if (roles != null) doc.append("roles", roles);
        return doc;
    }
}

