# MongoDB Configuration Migration

This document outlines the steps needed to update the OpenFrame MongoDB configuration to match the MeshCentral setup while ensuring compatibility with existing services.

## Completed Tasks

- [x] Analyze current MongoDB configurations
- [x] Identify differences between MeshCentral and OpenFrame MongoDB setups
- [x] Verify openframe-data compatibility requirements
- [x] Update MongoDB version to 8.0.9
- [x] Implement replica set configuration
- [x] Update security context settings
- [x] Update probes configuration
- [x] Modify volume and storage configuration

## In Progress Tasks

- [ ] Verify service connection compatibility

## Future Tasks

- [ ] Document new configuration for team reference
- [ ] Update service connection strings if needed

## Implementation Plan

### Phase 1: Configuration Updates
1. ✅ Update MongoDB version to 8.0.9
   - Updated statefulset.yaml to use mongo:8.0.9
   - Added replica set configuration
   - Removed authentication requirements

2. ✅ Implement replica set configuration (rs0)
   - Added rs.initiate() to mongo-init.sh
   - Configured single-node replica set
   - Added host configuration for replica set

3. ✅ Update security settings:
   - Removed authentication
   - Added replica set configuration
   - Removed user creation and password setup

4. ✅ Update health checks
   - Simplified readiness probe
   - Removed authentication from health checks
   - Updated mongodb-exporter configuration

5. ✅ Modify volume and storage configuration
   - Increased storage size to 10Gi
   - Added storage class specification
   - Added liveness probe
   - Optimized volume mounts

### Phase 2: Compatibility Verification
1. Verify all existing services can connect to new MongoDB configuration
2. Document any required connection string updates
3. Test connection stability

### Files Updated

1. ✅ manifests/openframe/base/mongodb/statefulset.yaml:
   - Removed environment variables for authentication
   - Updated MongoDB command to remove auth requirements
   - Added replica set configuration
   - Added liveness probe
   - Optimized volume configuration

2. ✅ manifests/openframe/base/mongodb/configmap.yaml:
   - Removed MONGO_APP_USERNAME
   - Kept only essential configuration

3. ✅ manifests/openframe/base/mongodb/scripts/mongo-init.sh:
   - Removed user creation
   - Removed password setup
   - Added replica set initialization
   - Kept database and collection initialization

4. ✅ manifests/openframe/base/mongodb-exporter/helm-values.yaml:
   - Updated MongoDB URI to remove authentication
   - Updated connection string format

5. ✅ manifests/openframe/base/mongodb/scripts/readiness-command.sh:
   - Removed authentication parameters
   - Simplified health check

6. ✅ manifests/openframe/base/mongodb/pvc.yaml:
   - Increased storage size to 10Gi
   - Added storage class specification
   - Added labels for better resource management

### Relevant Files

- manifests/openframe/base/mongodb/statefulset.yaml - Main MongoDB configuration
- manifests/openframe/base/mongodb/configmap.yaml - MongoDB configuration settings
- manifests/openframe/base/mongodb/secret.yaml - MongoDB secrets
- manifests/openframe/base/mongodb/pvc.yaml - Storage configuration
- manifests/openframe/base/mongodb/service.yaml - Service configuration

## Technical Details

### Current Configuration
- MongoDB version: 7.0.18
- Single instance setup
- Custom readiness probe
- Multiple volume mounts (data, logs, init scripts)
- Database: openframe
- Port: 27017
- Service name: mongodb

### Target Configuration
- MongoDB version: 8.0.9
- Replica set configuration (rs0)
- Simplified probe configuration
- Enhanced security context
- Optimized storage setup
- Same database name
- Same service name and port
- No authentication required
- Storage size increased to 10Gi

### Connection Compatibility
1. Service connection strings will be simplified to:
   ```
   mongodb://mongodb:27017/openframe
   ```
2. MongoDB will be accessible on the same port (27017)
3. Service name will remain unchanged
4. Spring Data MongoDB configuration will remain compatible 