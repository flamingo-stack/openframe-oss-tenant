# Enable MongoDB Replica Set for MeshCentral

This document tracks the plan to enable and configure MongoDB replica set for MeshCentral, and update MeshCentral to use the new replica set connection.

## Completed Tasks
- [x] Investigate current MeshCentral and MongoDB deployment and config
- [x] Research MeshCentral and MongoDB replica set best practices
- [x] Draft execution plan and implementation details

## In Progress Tasks
- [ ] Update MongoDB Kubernetes manifests to deploy a replica set (multiple pods, replica set init)
  - [ ] Draft new StatefulSet and headless Service YAML for MongoDB (staged for review)

## Future Tasks
- [ ] Add/init replica set configuration script (init container or Job)
- [ ] Update MeshCentral MongoDB connection string to use replica set URI and options
- [ ] Test failover and MeshCentral connectivity
- [ ] Update documentation and operational runbooks

## Implementation Plan

### 1. Update MongoDB Deployment to Replica Set
- Change `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb.yaml` to deploy 3 MongoDB pods (recommended minimum for production)
- Use a StatefulSet for stable network identity and persistent storage
- Expose each pod with a headless service for internal DNS
- Add an init Job or sidecar to initialize the replica set (using `rs.initiate()` and `rs.add()`)
- Ensure proper security, authentication, and persistent volumes for each member

### 2. Configure MeshCentral for Replica Set
- Update `integrated-tools/meshcentral/server/config.json`:
  - Change the `mongodb` connection string to use the replica set URI, e.g.:
    `mongodb://user:pass@mongo-0.mongo,mongo-1.mongo,mongo-2.mongo:27017/meshcentral?replicaSet=rs0&authSource=admin`
  - Optionally, set `readPreference` and `w=majority` for best reliability
- Ensure environment variables and Docker build args are updated if needed

### 3. Test and Validate
- Deploy the updated manifests
- Validate MongoDB replica set status (`rs.status()`)
- Validate MeshCentral can connect, read, and write with failover
- Simulate node failure and confirm MeshCentral remains operational

### 4. Documentation
- Update project documentation to describe the new architecture
- Add operational notes for scaling, failover, and backup

## Relevant Files
- `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb.yaml` - MongoDB deployment manifest (to be converted to StatefulSet and replica set aware)
- `integrated-tools/meshcentral/server/config.json` - MeshCentral MongoDB connection config
- `integrated-tools/meshcentral/server/Dockerfile` - May need updates for new env vars
- `integrated-tools/meshcentral/server/entrypoint.sh` - May need updates for new config
- `scripts/` (new or updated) - For replica set initialization

## Implementation Details
- Use official MongoDB Kubernetes patterns for StatefulSet replica sets: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- Use DNS hostnames for replica set members (e.g. `mongo-0.mongo`, `mongo-1.mongo`, ...)
- Ensure all MeshCentral instances use the new replica set URI
- Test with authentication enabled
- Consider backup/restore and monitoring for the new setup

---

# Execution Log

- **[STARTED]** Execution approved. Beginning implementation of MongoDB replica set for MeshCentral.
- **[NEXT]** Drafting new StatefulSet-based manifest for MongoDB in `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb.yaml` to support a 3-node replica set. Will explain all changes and rationale in this log.
- **[PROGRESS]** Preparing new StatefulSet and headless Service YAML for MongoDB. This will:
  - Replace the current Deployment with a StatefulSet for stable pod identity and persistent storage.
  - Add a headless Service to provide stable DNS for replica set members (required for MongoDB replica set discovery).
  - Set `replicaCount: 3` for high availability and fault tolerance.
  - Ensure each pod gets its own PersistentVolumeClaim.
  - Add environment variables and command args for replica set name and authentication.
  - The manifest will be staged for review before proceeding to the replica set init scripting step.
- **[DONE]** Drafted and staged new StatefulSet and headless Service manifest in `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb.yaml`:
  - StatefulSet with 3 replicas, each with its own PVC, running `mongod --replSet=rs0 --auth --bind_ip_all`.
  - Headless Service (`clusterIP: None`) for stable DNS and replica set discovery.
  - Environment variables for root user, password, and database.
  - Manifest is ready for review and further steps.
- **[PROGRESS]** Preparing a Kubernetes Job manifest and script to initialize the MongoDB replica set:
  - The Job will connect to the first MongoDB pod (`meshcentral-mongodb-0.meshcentral-mongodb`).
  - It will check if the replica set is already initialized.
  - If not, it will run `rs.initiate()` and then `rs.add()` for the other two members.
  - The script will use the MongoDB shell and credentials from environment variables.
  - This approach ensures idempotency and can be re-run safely if needed.
  - The Job manifest and script will be staged for review before applying.
- **[DONE]** Created and staged `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb-init-replicaset.yaml`:
  - The Job waits for the primary pod to be ready, checks if the replica set is initialized, and if not, runs `rs.initiate()` with all three members.
  - Uses the official mongo image and root credentials from env vars.
  - Safe to re-run; exits if already initialized.
  - Ready for review and application.
- **[DONE]** Updated `integrated-tools/meshcentral/server/config.json`:
  - The MongoDB connection string now uses the replica set URI, listing all three members and specifying `replicaSet=rs0` and `authSource=admin`.
  - This ensures MeshCentral can connect to the replica set and handle failover.
- **[NEXT]** Test the deployment:
  - Apply the StatefulSet, headless Service, and replica set init Job manifests.
  - Verify the replica set is healthy (`rs.status()`), MeshCentral can connect, and failover works as expected.
  - Document any issues and update operational runbooks as needed.

## Relevant Files
- `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb.yaml` - MongoDB deployment manifest (to be converted to StatefulSet and replica set aware)
- `integrated-tools/meshcentral/server/config.json` - MeshCentral MongoDB connection config
- `integrated-tools/meshcentral/server/Dockerfile` - May need updates for new env vars
- `integrated-tools/meshcentral/server/entrypoint.sh` - May need updates for new config
- `scripts/` (new or updated) - For replica set initialization
- `deploy/dev/integrated-tools-datasources/meshcentral/base/mongodb-init-replicaset.yaml` - Kubernetes Job manifest for initializing the replica set 