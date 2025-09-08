package com.openframe.data.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantDiscoverResponse {
    private String email;
    private boolean has_existing_accounts;
    private String tenant_id;
    private String auth_providers;
}
