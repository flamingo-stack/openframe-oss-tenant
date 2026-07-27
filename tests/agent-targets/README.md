# Agent install matrix

Proves the OpenFrame agent installs, enrols and brings up its tool agents on a
Windows machine that has never seen it before.

Run by [`.github/workflows/agent-install-matrix.yml`](../../.github/workflows/agent-install-matrix.yml)
against ephemeral machines from the
[agent-targets](https://github.com/flamingo-stack/openframe-saas-tf/tree/main/openframe-agent-targets).

```
plan ──► for each OS ──► provision VM ──► install ──► verify ──► collect ──► destroy
          (matrix.yml)     (stable name,   (SSH)      (assert)   (always)   (always)
                            SSH, no
                            public IP)
```

## Coverage

| Target | Instance | Image |
|---|---|---|
| Windows Server 2025 | `agent-targets-win-server-2025` | `windows-cloud/windows-2025` |
| Windows Server 2022 | `agent-targets-win-server-2022` | `windows-cloud/windows-2022` |
| Windows 11 25H2 | `agent-targets-win11-25h2` | custom — must be imported once, see below |
| Windows 11 24H2 | `agent-targets-win11-24h2` | custom — must be imported once, see below |

## Files

| File | Role |
|---|---|
| `matrix.yml` | Which machines we test on. The only file you edit to add or drop an OS. |
| `install-windows.ps1` | Put the agent on the target and enrol it. |
| `verify-windows.ps1` | Assert the outcome. |
| `collect-windows.ps1` | Best-effort diagnostics before the machine dies. Always exits 0. |

## Reaching a target by hand

Instance names are stable and never carry a run id, so the command never changes:

```bash
gcloud compute ssh agent-targets-win11-25h2 \
  --project=<AGENT_TARGETS_PROJECT> --zone=<AGENT_TARGETS_ZONE> --tunnel-through-iap
```

The default SSH shell is PowerShell and the session runs elevated. Other machines
on the agent-targets subnet resolve the target as `<instance>.<zone>.c.<project>.internal`.

Targets are destroyed at the end of a run. To keep them, dispatch the workflow
with `keep_targets: true` — the reaper will still collect them once they exceed
its age threshold, which is the point.

Because the name *is* the identity, only one run may be in flight at a time. The
workflow enforces this with a single global concurrency group, and provisioning
deletes any leftover instance of the same name before creating a new one.

## Adding an OS

Append to `targets:` in `matrix.yml`. No Terraform apply is needed.

```yaml
- key: windows-server-2019
  instance: agent-targets-win-server-2019   # must be unique; the plan job rejects duplicates
  os_type: windows
  image_source: family
  image_project: windows-cloud
  image_family: windows-2019
  tier: extended        # start here; promote to core once it has been green for a while
```

`tier: core` blocks a release. `tier: extended` reports and moves on.

## What is verified

1. The binary landed where `Service::exec_path()`
   ([`clients/openframe-client/src/service.rs`](../../clients/openframe-client/src/service.rs))
   expects it.
2. The Windows service `com.openframe.client` is **running** and set to start
   automatically — not merely registered.
3. `secured/initial_config.json` exists and is non-empty — the only on-box
   evidence that registration *completed*. The process staying up proves nothing:
   it retries forever.
4. A directory exists for each required tool agent (`*meshcentral*`, `*fleet*`).
   `tool_agent_id` is server-assigned, so these match on substring the way
   `ToolInstallationService` itself does.
5. The agent log contains no panic or fatal.

`tactical-rmm` is checked but **never fatal** — it is being removed platform-wide
(see the `ws-restriction` note in `openframe-saas-shared/configs/*/openframe-saas-gateway.yml`),
and its removal must not turn the matrix red.

## Secrets and variables

Terraform emits everything but the enrolment credentials:
`terraform output -json github_actions_variables` in `openframe-agent-targets/01-runtime`.

| Repo **variable** | From |
|---|---|
| `AGENT_TARGETS_PROJECT`, `AGENT_TARGETS_SUBNET`, `AGENT_TARGETS_TAG`, `AGENT_TARGETS_BUCKET` | `00-foundation` |
| `AGENT_TARGETS_WIF_PROVIDER`, `AGENT_TARGETS_PROVISIONER_SA`, `AGENT_TARGETS_VM_SA` | `01-runtime` |
| `AGENT_TARGETS_ZONE` | optional, defaults to `us-central1-a` |

| Repo **secret** | What |
|---|---|
| `AGENT_TARGETS_SERVER_URL` | The dev tenant these agents enrol into. Must not be stage or prod — every run registers machines that are then destroyed, and the churn is visible in that tenant's device list. |
| `AGENT_TARGETS_INITIAL_KEY` | Registration secret from `/api/agent/registration-secret/active`. |
| `AGENT_TARGETS_ORG_ID` | Organisation the test devices land in. |

No service-account key is involved anywhere: `iam.disableServiceAccountKeyCreation`
is enforced org-wide, so CI authenticates through OIDC → Workload Identity
Federation.

## Known gaps

- **Windows 11 needs a custom image that does not exist yet.** Compute Engine
  publishes no Windows 11 image. Those two legs fail with an explicit message
  until the image is imported once — and the licensing question behind it (BYOL
  on dedicated hardware) is a budget decision, not an engineering one. Full detail
  in [`openframe-agent-targets/README.md` §6](https://github.com/flamingo-stack/openframe-saas-tf/blob/main/openframe-agent-targets/README.md).
- **Artifacts are not integrity-checked.** `install-windows.ps1` accepts an
  optional `-ArtifactSha256` and warns loudly when it is absent — which is always,
  because the release pipeline publishes no checksums for client artifacts. An
  installer downloaded over the network and executed with admin rights is the last
  artifact that should be unverified.
