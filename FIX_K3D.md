# Fix k3d Cluster Naming Consistency

This task list tracks all places in the scripts where the k3d cluster name (and related container names) are referenced, to ensure naming is consistent across creation, deletion, and all operations.

## Completed Tasks

- [ ] (none yet)

## In Progress Tasks

- [ ] Map all current references to k3d cluster/container names in scripts
- [ ] Decide on a single canonical cluster name (e.g., `openframe-dev` or `openframe`)
- [ ] Update all scripts to use the canonical name for creation, deletion, and all operations
- [ ] Test cluster creation and deletion to ensure no orphaned containers remain

## Future Tasks

- [ ] Add a script check to enforce cluster name consistency
- [ ] Document the canonical cluster name in `scripts/README.md`

## Implementation Plan


1. **Mapping**: 
   - All references to `openframe-dev`, `k3d-openframe-dev-*`, `k3d-openframe-registry`, etc., are found in:
     - `scripts/run.sh` (creation, deletion, start, stop, cleanup)
     - `scripts/functions/apps-setup-cluster.sh` (creation, deletion, kubeconfig, registry)
     - `scripts/manage-apps.sh` (cleanup)
     - `scripts/functions/variables.sh` (possibly for env vars)
     - `scripts/run-windows.ps1` (installation, verification)
     - `dev/registries.yaml` (registry URL)
   - Container names like `k3d-openframe-server-0`, `k3d-openframe-serverlb`, `k3d-openframe-tools` are created by k3d based on the cluster name.

2. **Canonical Name**: 
   - Choose a single cluster name (e.g., `openframe-dev`).
   - Ensure all scripts use this name for all k3d operations.

3. **Update Scripts**: 
   - Update all hardcoded references in all scripts to use the canonical name.
   - Use variables where possible to avoid future drift.

4. **Test**: 
   - Create and delete the cluster using the scripts.
   - Verify no orphaned containers remain in Docker Desktop.

5. **Document**: 
   - Add a section to `scripts/README.md` about the canonical cluster name and its importance.

### Relevant Files

- scripts/run.sh - Main entry for cluster create/delete/start/stop
- scripts/functions/apps-setup-cluster.sh - Cluster setup, config, registry
- scripts/manage-apps.sh - Cleanup and app management
- scripts/functions/variables.sh - Environment variables
- scripts/run-windows.ps1 - Windows install/verify
- dev/registries.yaml - Registry config for k3d

## Mapping of Current References

- `openframe-dev` (cluster name) in:
  - scripts/run.sh (lines 89, 106, 132, 140, 146)
  - scripts/functions/apps-setup-cluster.sh (lines 103, 104, 105, 112, 138, 169, 180, 185, 189, 196, 200, 203, 215, 231, 234, 235, 246, 251)
- `k3d-openframe-dev-*` (container names) in:
  - scripts/run.sh (line 132)
- `k3d-openframe-registry` (registry) in:
  - scripts/run.sh (lines 108, 109)
  - scripts/functions/apps-setup-cluster.sh (lines 169, 261, 274, 275)
- `openframe-server`, `openframe-serverlb`, `openframe-tools` (container names) - created by k3d based on cluster name

## Notes
- All scripts must use the same cluster name for all k3d operations.
- Use a variable for the cluster name in all scripts to prevent future inconsistencies.
- After refactor, verify with `k3d cluster list` and Docker Desktop that no orphaned containers remain after deletion. 