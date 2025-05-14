# Local Registry Integration for Skaffold

Re-add local Docker registry creation for k3d and update all Skaffold configs to use the local registry for image builds and pushes.

## Completed Tasks

- [x] Remove old registry and mirror configuration (previously done)
- [x] Clean up registry references in scripts and docs

## In Progress Tasks

- [ ] Draft task plan and get approval
- [ ] Identify all Skaffold config files in the repo
- [ ] Decide on registry naming convention (`k3d-openframe-registry:5050` vs `localhost:5050`)
- [x] Update cluster setup script to create the local registry container if missing
- [x] Update cluster setup script to connect registry to k3d network
- [x] Update all Skaffold files to use the local registry for image builds
- [ ] Update documentation to reflect new registry usage
- [ ] Test: Build and deploy a service using Skaffold to ensure images are pushed/pulled from the local registry

## Future Tasks

- [ ] (Optional) Add registry health check to setup script
- [ ] (Optional) Add cleanup logic for registry container
- [ ] (Optional) Add support for registry mirrors if needed in the future

## Implementation Plan

1. **Registry Creation**
   - In `apps-setup-cluster.sh` (or equivalent), add logic to:
     - Check if `k3d-openframe-registry` is running; if not, create it:
       ```bash
       docker run -d --restart=always -p 5050:5000 --name k3d-openframe-registry registry:2
       ```
     - Connect the registry to the k3d network:
       ```bash
       docker network connect k3d-openframe-dev k3d-openframe-registry || true
       ```
   - Print instructions for pushing images if needed.

2. **Skaffold Config Update**
   - Find all `skaffold.yaml` files in the repo.
   - For each, update the `build.artifacts.image` to use `k3d-openframe-registry:5050/<image-name>`.
   - Set `local.push: true` to ensure images are pushed to the registry.

3. **Documentation**
   - Update `scripts/README.md` and any other relevant docs to describe the new registry workflow.

4. **Testing**
   - Build and deploy at least one service using Skaffold.
   - Verify the image is pushed to and pulled from the local registry.

### Relevant Files

- `scripts/functions/apps-setup-cluster.sh` – Add registry creation logic
- `services/*/skaffold.yaml` – Update image names and push settings
- `scripts/README.md` – Update documentation

# Local Registry Integration for Skaffold

Re-add local Docker registry creation for k3d and update all Skaffold configs to use the local registry for image builds and pushes.

## Completed Tasks

- [x] Remove old registry and mirror configuration (previously done)
- [x] Clean up registry references in scripts and docs

## In Progress Tasks

- [ ] Draft task plan and get approval
- [ ] Identify all Skaffold config files in the repo
- [ ] Decide on registry naming convention (`k3d-openframe-registry:5050` vs `localhost:5050`)
- [x] Update cluster setup script to create the local registry container if missing
- [x] Update cluster setup script to connect registry to k3d network
- [x] Update all Skaffold files to use the local registry for image builds
- [ ] Update documentation to reflect new registry usage
- [ ] Test: Build and deploy a service using Skaffold to ensure images are pushed/pulled from the local registry

## Future Tasks

- [ ] (Optional) Add registry health check to setup script
- [ ] (Optional) Add cleanup logic for registry container
- [ ] (Optional) Add support for registry mirrors if needed in the future

## Implementation Plan

1. **Registry Creation**
   - In `apps-setup-cluster.sh` (or equivalent), add logic to:
     - Check if `k3d-openframe-registry` is running; if not, create it:
       ```bash
       docker run -d --restart=always -p 5050:5000 --name k3d-openframe-registry registry:2
       ```
     - Connect the registry to the k3d network:
       ```bash
       docker network connect k3d-openframe-dev k3d-openframe-registry || true
       ```
   - Print instructions for pushing images if needed.

2. **Skaffold Config Update**
   - Find all `skaffold.yaml` files in the repo.
   - For each, update the `build.artifacts.image` to use `k3d-openframe-registry:5050/<image-name>`.
   - Set `local.push: true` to ensure images are pushed to the registry.

3. **Documentation**
   - Update `scripts/README.md` and any other relevant docs to describe the new registry workflow.

4. **Testing**
   - Build and deploy at least one service using Skaffold.
   - Verify the image is pushed to and pulled from the local registry.

### Relevant Files

- `scripts/functions/apps-setup-cluster.sh` – Add registry creation logic
- `services/*/skaffold.yaml` – Update image names and push settings
- `scripts/README.md` – Update documentation

# Local Registry Integration for Skaffold

Re-add local Docker registry creation for k3d and update all Skaffold configs to use the local registry for image builds and pushes.

## Completed Tasks

- [x] Remove old registry and mirror configuration (previously done)
- [x] Clean up registry references in scripts and docs

## In Progress Tasks

- [ ] Draft task plan and get approval
- [ ] Identify all Skaffold config files in the repo
- [ ] Decide on registry naming convention (`k3d-openframe-registry:5050` vs `localhost:5050`)
- [x] Update cluster setup script to create the local registry container if missing
- [x] Update cluster setup script to connect registry to k3d network
- [x] Update all Skaffold files to use the local registry for image builds
- [ ] Update documentation to reflect new registry usage
- [ ] Test: Build and deploy a service using Skaffold to ensure images are pushed/pulled from the local registry

## Future Tasks

- [ ] (Optional) Add registry health check to setup script
- [ ] (Optional) Add cleanup logic for registry container
- [ ] (Optional) Add support for registry mirrors if needed in the future

## Implementation Plan

1. **Registry Creation**
   - In `apps-setup-cluster.sh` (or equivalent), add logic to:
     - Check if `k3d-openframe-registry` is running; if not, create it:
       ```bash
       docker run -d --restart=always -p 5050:5000 --name k3d-openframe-registry registry:2
       ```
     - Connect the registry to the k3d network:
       ```bash
       docker network connect k3d-openframe-dev k3d-openframe-registry || true
       ```
   - Print instructions for pushing images if needed.

2. **Skaffold Config Update**
   - Find all `skaffold.yaml` files in the repo.
   - For each, update the `build.artifacts.image` to use `k3d-openframe-registry:5050/<image-name>`.
   - Set `local.push: true` to ensure images are pushed to the registry.

3. **Documentation**
   - Update `scripts/README.md` and any other relevant docs to describe the new registry workflow.

4. **Testing**
   - Build and deploy at least one service using Skaffold.
   - Verify the image is pushed to and pulled from the local registry.

### Relevant Files

- `scripts/functions/apps-setup-cluster.sh` – Add registry creation logic
- `services/*/skaffold.yaml` – Update image names and push settings
- `scripts/README.md` – Update documentation 