package com.openframe.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDocument {
    private String id;
    private String name;
    private String domain;
    private String status;
    private String plan;
    private Boolean active;
    private String ownerId;

    public static TenantDocument fromDocument(Document doc) {
        if (doc == null) return null;
        
        return TenantDocument.builder()
                .id(doc.getString("_id"))
                .name(doc.getString("name"))
                .domain(doc.getString("domain"))
                .status(doc.getString("status"))
                .plan(doc.getString("plan"))
                .active(doc.getBoolean("active"))
                .ownerId(doc.getString("ownerId"))
                .build();
    }

    public Document toDocument() {
        Document doc = new Document();
        if (id != null) doc.append("_id", id);
        if (name != null) doc.append("name", name);
        if (domain != null) doc.append("domain", domain);
        if (status != null) doc.append("status", status);
        if (plan != null) doc.append("plan", plan);
        if (active != null) doc.append("active", active);
        if (ownerId != null) doc.append("ownerId", ownerId);
        return doc;
    }
}

