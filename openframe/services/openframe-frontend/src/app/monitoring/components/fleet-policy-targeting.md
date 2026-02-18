# Fleet API: Policies Targeting Specific Hosts

Fleet does not support assigning policies directly to individual host IDs. Instead, you create **labels** (groups of hosts) and associate them with policies via `labels_include_any` or `labels_exclude_any`.

This document covers the full workflow: managing labels, then creating/editing policies with label-based targeting.

> All endpoints use the base path `/api/latest/fleet`. Replace `FLEET_URL` and `FLEET_API_TOKEN` in the examples below with your Fleet server URL and API token.

---

## Key Constraints

- **Cannot combine `labels_include_any` and `labels_exclude_any`** on the same policy. The API returns an error if both are provided.
- Labels are referenced by **name** (string), not by ID.
- Referenced labels **must already exist** before creating/editing a policy.
- Valid platforms: `windows`, `linux`, `darwin`, `chrome` (comma-separated for multiple).
- **`labels_include_any`** uses OR logic: a host is targeted if it belongs to **at least one** listed label.
- **`labels_exclude_any`** uses OR logic: a host is excluded if it belongs to **any** listed label.

---

## 1. Labels Management

### List Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/latest/fleet/labels` | Paginated list. Query params: `per_page`, `page`, `team_id`, `include_host_counts` |
| `GET` | `/api/latest/fleet/labels/summary` | Lightweight (id + name + description only). Query param: `team_id` |
| `GET` | `/api/latest/fleet/labels/{id}` | Single label by ID |
| `GET` | `/api/latest/fleet/labels/{id}/hosts` | Hosts belonging to a label |

```bash
# List all labels
curl -s -X GET "${FLEET_URL}/api/latest/fleet/labels" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .

# List label summaries (lightweight)
curl -s -X GET "${FLEET_URL}/api/latest/fleet/labels/summary" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .

# Get a single label by ID
curl -s -X GET "${FLEET_URL}/api/latest/fleet/labels/42" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .

# List hosts in a label
curl -s -X GET "${FLEET_URL}/api/latest/fleet/labels/42/hosts" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .
```

### Create a Label

**Endpoint:** `POST /api/latest/fleet/labels`

**Payload fields** (from `LabelPayload`):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required.** Label name. |
| `query` | string | SQL query for **dynamic** labels. Must be empty for manual labels. |
| `hosts` | array of strings | Host identifiers (UUID, serial number, hostname) for **manual** labels. |
| `host_ids` | array of integers | Host IDs for **manual** labels. |
| `platform` | string | Target platform filter. |
| `description` | string | Label description. |

**Rules:**
- Provide `query` **or** `hosts`/`host_ids`, not both (dynamic vs. manual label).
- Cannot use both `hosts` and `host_ids` together.
- If neither `query` nor `hosts`/`host_ids` is provided, a manual label with no members is created.

```bash
# Create a manual label with specific hosts (by identifier)
curl -s -X POST "${FLEET_URL}/api/latest/fleet/labels" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Policy Target: Finance Laptops",
    "description": "Specific hosts for finance policy targeting",
    "hosts": ["SERIAL001", "SERIAL002"]
  }' | jq .

# Create a manual label with specific hosts (by host ID)
curl -s -X POST "${FLEET_URL}/api/latest/fleet/labels" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Policy Target: Dev Machines",
    "description": "Development machines for targeted policies",
    "host_ids": [101, 102, 103]
  }' | jq .

# Create a dynamic label (SQL query)
curl -s -X POST "${FLEET_URL}/api/latest/fleet/labels" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hosts with Docker",
    "description": "All hosts running Docker",
    "query": "SELECT 1 FROM programs WHERE name = '\''Docker'\''"
  }' | jq .
```

### Update a Label

**Endpoint:** `PATCH /api/latest/fleet/labels/{id}`

**Payload fields** (from `ModifyLabelPayload`):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | New label name. Omit to leave unchanged. |
| `description` | string | New description. Omit to leave unchanged. |
| `hosts` | array of strings | New host identifiers. Only for manual labels. `[]` removes all members. Omit (`null`) to leave unchanged. |
| `host_ids` | array of integers | New host IDs. Only for manual labels. `[]` removes all members. Omit to leave unchanged. |

```bash
# Update label members (replace the host list)
curl -s -X PATCH "${FLEET_URL}/api/latest/fleet/labels/42" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hosts": ["SERIAL001", "SERIAL003", "SERIAL004"]
  }' | jq .

# Remove all members from a manual label
curl -s -X PATCH "${FLEET_URL}/api/latest/fleet/labels/42" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hosts": []
  }' | jq .
```

### Delete a Label

| Method | Endpoint | Description |
|--------|----------|-------------|
| `DELETE` | `/api/latest/fleet/labels/{name}` | Delete by name |
| `DELETE` | `/api/latest/fleet/labels/id/{id}` | Delete by ID |

Built-in labels (e.g., "All Hosts", "macOS", "MS Windows", "All Linux", "chrome") cannot be deleted.

```bash
# Delete by name
curl -s -X DELETE "${FLEET_URL}/api/latest/fleet/labels/Policy%20Target%3A%20Finance%20Laptops" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .

# Delete by ID
curl -s -X DELETE "${FLEET_URL}/api/latest/fleet/labels/id/42" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .
```

---

## 2. Policy Creation/Editing with Label Targeting

### Create a Global Policy

**Endpoint:** `POST /api/latest/fleet/policies`

**Payload fields** (from `globalPolicyRequest`):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required.** Policy name. |
| `query` | string | **Required.** SQL query (osquery). |
| `description` | string | Policy description. |
| `resolution` | string | Steps to resolve a failing policy. |
| `platform` | string | Comma-separated platforms: `windows`, `linux`, `darwin`, `chrome`. Empty = all. |
| `critical` | boolean | Mark as high-impact (Premium only). |
| `labels_include_any` | array of strings | Label **names**. Policy targets hosts in **any** of these labels. |
| `labels_exclude_any` | array of strings | Label **names**. Policy excludes hosts in **any** of these labels. |

```bash
curl -s -X POST "${FLEET_URL}/api/latest/fleet/policies" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FileVault enabled (Finance only)",
    "query": "SELECT 1 FROM disk_encryption WHERE encrypted = 1 AND type = '\''AES-XTS'\'';",
    "description": "Checks FileVault is enabled on targeted hosts",
    "resolution": "Enable FileVault via System Preferences > Security & Privacy",
    "platform": "darwin",
    "labels_include_any": ["Policy Target: Finance Laptops"]
  }' | jq .
```

### Create a Team Policy

**Endpoint:** `POST /api/latest/fleet/teams/{team_id}/policies`

**Payload fields** (from `teamPolicyRequest`): same as global policy, plus:

| Field | Type | Description |
|-------|------|-------------|
| `calendar_events_enabled` | boolean | Enable calendar events for this policy. |
| `software_title_id` | integer | Software title to install on policy failure. |
| `script_id` | integer | Script to run on policy failure. |
| `conditional_access_enabled` | boolean | Enable Microsoft conditional access. |

```bash
curl -s -X POST "${FLEET_URL}/api/latest/fleet/teams/1/policies" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OS up to date (Dev Machines)",
    "query": "SELECT 1 FROM os_version WHERE version >= '\''14.0'\'';",
    "description": "Ensure macOS is up to date on dev machines",
    "platform": "darwin",
    "labels_include_any": ["Policy Target: Dev Machines"]
  }' | jq .
```

### Modify a Policy

| Scope | Method | Endpoint |
|-------|--------|----------|
| Global | `PATCH` | `/api/latest/fleet/policies/{policy_id}` |
| Team | `PATCH` | `/api/latest/fleet/teams/{team_id}/policies/{policy_id}` |

**Payload fields** (from `ModifyPolicyPayload`):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | New name. |
| `query` | string | New query. |
| `description` | string | New description. |
| `resolution` | string | New resolution steps. |
| `platform` | string | New platform filter. |
| `critical` | boolean | High-impact flag (Premium only). |
| `labels_include_any` | array of strings | Replace the include-any label list. |
| `labels_exclude_any` | array of strings | Replace the exclude-any label list. |
| `calendar_events_enabled` | boolean | Team policies only. |
| `software_title_id` | integer | Team policies only. Set to `0` to unset. |
| `script_id` | integer | Team policies only. Set to `0` to unset. |
| `conditional_access_enabled` | boolean | Team policies only. |

```bash
# Modify a global policy's label targeting
curl -s -X PATCH "${FLEET_URL}/api/latest/fleet/policies/5" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "labels_include_any": ["Policy Target: Finance Laptops", "Policy Target: Dev Machines"]
  }' | jq .

# Switch a policy from include to exclude targeting
curl -s -X PATCH "${FLEET_URL}/api/latest/fleet/policies/5" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "labels_include_any": [],
    "labels_exclude_any": ["Hosts with Docker"]
  }' | jq .
```

### Apply Policy Specs (Bulk)

**Endpoint:** `POST /api/latest/fleet/spec/policies`

**Payload:** `{ "specs": [...] }` where each spec (`PolicySpec`) includes:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required.** Policy name (used as unique identifier). |
| `query` | string | **Required.** SQL query. |
| `description` | string | Description. |
| `resolution` | string | Resolution steps. |
| `team` | string | Team name. Empty = global policy. |
| `platform` | string | Platform filter. |
| `critical` | boolean | High-impact flag. |
| `labels_include_any` | array of strings | Label names for include-any targeting. |
| `labels_exclude_any` | array of strings | Label names for exclude-any targeting. |
| `calendar_events_enabled` | boolean | Team policies only. |
| `software_title_id` | integer | Team policies only. |
| `script_id` | integer | Team policies only. |
| `conditional_access_enabled` | boolean | Team policies only. |

```bash
curl -s -X POST "${FLEET_URL}/api/latest/fleet/spec/policies" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "specs": [
      {
        "name": "Disk encryption (Finance)",
        "query": "SELECT 1 FROM disk_encryption WHERE encrypted = 1;",
        "description": "Verify disk encryption on finance hosts",
        "platform": "darwin,windows",
        "labels_include_any": ["Policy Target: Finance Laptops"]
      },
      {
        "name": "Screen lock enabled (all except Docker hosts)",
        "query": "SELECT 1 FROM screenlock WHERE enabled = 1;",
        "description": "Ensure screen lock except on Docker build hosts",
        "labels_exclude_any": ["Hosts with Docker"]
      }
    ]
  }' | jq .
```

---

## 3. End-to-End Example

A complete walkthrough: create a label targeting specific hosts, create a policy scoped to that label, verify it, modify it, and clean up.

### Step 1: Create a manual label with specific hosts

```bash
curl -s -X POST "${FLEET_URL}/api/latest/fleet/labels" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Audit Target Hosts",
    "description": "Hosts selected for security audit",
    "hosts": ["C02X1234ABCD", "DESKTOP-A1B2C3"]
  }' | jq .
```

Response (note the label `id`):
```json
{
  "label": {
    "id": 50,
    "name": "Audit Target Hosts",
    "description": "Hosts selected for security audit",
    "label_type": "regular",
    "label_membership_type": "manual"
  }
}
```

### Step 2: Create a global policy targeting that label

```bash
curl -s -X POST "${FLEET_URL}/api/latest/fleet/policies" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Firewall enabled (Audit Targets)",
    "query": "SELECT 1 FROM alf WHERE global_state = 1;",
    "description": "Ensure firewall is enabled on audit target hosts",
    "resolution": "Enable the firewall: System Preferences > Network > Firewall > Turn On",
    "platform": "darwin",
    "labels_include_any": ["Audit Target Hosts"]
  }' | jq .
```

Response (note the policy `id`):
```json
{
  "policy": {
    "id": 12,
    "name": "Firewall enabled (Audit Targets)",
    "query": "SELECT 1 FROM alf WHERE global_state = 1;",
    "platform": "darwin",
    "labels_include_any": [
      { "id": 50, "name": "Audit Target Hosts" }
    ]
  }
}
```

### Step 3: Verify the policy

```bash
curl -s -X GET "${FLEET_URL}/api/latest/fleet/policies/12" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .
```

Confirm `labels_include_any` contains the expected label.

### Step 4: Modify the policy's label targeting

Add a second label to the include list:

```bash
curl -s -X PATCH "${FLEET_URL}/api/latest/fleet/policies/12" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "labels_include_any": ["Audit Target Hosts", "Policy Target: Finance Laptops"]
  }' | jq .
```

### Step 5: Clean up

```bash
# Delete the policy
curl -s -X POST "${FLEET_URL}/api/latest/fleet/policies/delete" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"ids": [12]}' | jq .

# Delete the label (by name)
curl -s -X DELETE "${FLEET_URL}/api/latest/fleet/labels/Audit%20Target%20Hosts" \
  -H "Authorization: Bearer ${FLEET_API_TOKEN}" | jq .
```

---

## Source Reference

The API structures are defined in the Fleet codebase:

- **Labels:** `server/fleet/labels.go` — `LabelPayload`, `ModifyLabelPayload`, `Label`
- **Policies:** `server/fleet/policies.go` — `PolicyPayload`, `ModifyPolicyPayload`, `PolicySpec`, `PolicyData`
- **Global policy endpoint:** `server/service/global_policies.go` — `globalPolicyRequest`
- **Team policy endpoint:** `server/service/team_policies.go` — `teamPolicyRequest`, `modifyTeamPolicyRequest`
- **Route registration:** `server/service/handler.go` — label routes (lines 462-472), policy routes (lines 313-338)
