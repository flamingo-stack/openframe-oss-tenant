/** Editable tenant profile (MSP Organization) — mirrors the `TenantInfo` GraphQL type. */
export interface TenantImage {
  imageUrl?: string | null;
  hash?: string | null;
}

export interface TenantInfo {
  id: string;
  name?: string | null;
  website?: string | null;
  image?: TenantImage | null;
}

/** Variables for the `updateTenantInfo` mutation. Only non-null fields are applied by the BE. */
export interface UpdateTenantInfoInput {
  name?: string;
  website?: string;
}
