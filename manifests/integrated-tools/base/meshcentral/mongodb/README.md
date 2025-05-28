# MeshCentral MongoDB Configuration

This directory contains the Kubernetes manifests for deploying a MongoDB replica set used by MeshCentral.

## Components

### 1. mongodb.yaml
Deploys a 3-node MongoDB replica set using StatefulSet with the following features:
- Headless Service for stable network identity
- StatefulSet with 3 replicas for high availability
- Persistent storage for each pod
- Authentication enabled with keyFile
- Health checks and readiness probes
- Proper DNS resolution for replica set communication

### 2. mongodb-init-replicaset.yaml
Kubernetes Job that initializes the MongoDB replica set:
- Waits for all MongoDB pods to be ready
- Initializes the replica set configuration
- Creates admin user with proper roles
- Verifies replica set health

## Deployment Order

1. Create MongoDB keyFile secret (if not exists):
```bash
# Generate keyfile and create secret
openssl rand -base64 756 > mongodb-keyfile
kubectl create secret generic mongodb-keyfile \
  --from-file=keyfile=mongodb-keyfile \
  --namespace=integrated-tools-datasources
rm mongodb-keyfile
```

2. Deploy MongoDB StatefulSet and Service:
```bash
kubectl apply -f mongodb.yaml
```

3. Wait for MongoDB pods to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=meshcentral-mongodb -n integrated-tools-datasources
```

4. Initialize the replica set:
```bash
kubectl apply -f mongodb-init-replicaset.yaml
```

## Connection Details

MeshCentral connects to MongoDB using the following URI format:
```
mongodb://mongouser:mongopass@meshcentral-mongodb-0.meshcentral-mongodb:27017,meshcentral-mongodb-1.meshcentral-mongodb:27017,meshcentral-mongodb-2.meshcentral-mongodb:27017/meshcentral?replicaSet=rs0&authSource=admin
```

## Monitoring

1. Check replica set status:
```bash
kubectl exec -it meshcentral-mongodb-0 -n integrated-tools-datasources -- \
  mongo -u mongouser -p mongopass --authenticationDatabase admin \
  --eval "rs.status()"
```

2. Check pod status:
```bash
kubectl get pods -n integrated-tools-datasources -l app=meshcentral-mongodb
```

3. View initialization job logs:
```bash
kubectl logs -f job/mongodb-init-replicaset -n integrated-tools-datasources
```

## Troubleshooting

1. If pods are not ready:
   - Check pod events: `kubectl describe pod meshcentral-mongodb-0 -n integrated-tools-datasources`
   - Check pod logs: `kubectl logs meshcentral-mongodb-0 -n integrated-tools-datasources`

2. If replica set initialization fails:
   - Check job logs: `kubectl logs job/mongodb-init-replicaset -n integrated-tools-datasources`
   - Delete and reapply the job: 
     ```bash
     kubectl delete -f mongodb-init-replicaset.yaml
     kubectl apply -f mongodb-init-replicaset.yaml
     ```

3. If authentication issues occur:
   - Verify keyFile secret exists: `kubectl get secret mongodb-keyfile -n integrated-tools-datasources`
   - Check keyFile permissions in pod: `kubectl exec -it meshcentral-mongodb-0 -n integrated-tools-datasources -- ls -l /etc/mongodb/keyfile`

## Security Notes

- Authentication is enabled using keyFile
- Admin user is created during initialization
- Each pod mounts the keyFile with proper permissions (0400)
- Internal communication between replica set members is authenticated
- Client connections require proper credentials and authentication database 

## Deployment Notes

### Initial Deployment Behavior
During the first deployment, you might see an error message:
```
Error: MongoDB replica set is not healthy
```
This is normal and occurs because:
1. The replica set needs time to elect a primary node
2. All nodes need time to establish connections
3. Authentication needs to be properly propagated across all nodes

**Solution**: 
- Wait for 1-2 minutes after seeing this error
- Run the deployment script again (`./scripts/run-mac.sh b` or `./scripts/run.sh b`)
- The second run should show a healthy replica set

### Deployment Best Practices
1. Always allow sufficient time for the replica set to stabilize
2. Verify replica set health after initial deployment:
   ```bash
   kubectl exec -it meshcentral-mongodb-0 -n integrated-tools-datasources -- \
     mongo -u mongouser -p mongopass --authenticationDatabase admin \
     --eval "rs.status()"
   ```
3. Check that all three nodes are running and properly connected:
   ```bash
   kubectl get pods -n integrated-tools-datasources -l app=meshcentral-mongodb
   ``` 