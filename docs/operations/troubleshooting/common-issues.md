# Common Issues and Troubleshooting

This guide covers the most frequently encountered issues in OpenFrame deployments and their solutions.

## Quick Diagnostic Commands

```bash
# Check overall system health
kubectl get pods --all-namespaces
curl http://localhost:8080/actuator/health

# Check service logs
kubectl logs -f deployment/openframe-api -n microservices
kubectl logs -f deployment/openframe-gateway -n microservices

# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Check network connectivity
kubectl exec -it pod-name -- nslookup service-name
curl -v http://service-name:port/health
```

## Service Startup Issues

### Gateway Service Won't Start

**Symptoms:**
- Gateway pod in CrashLoopBackOff state
- Cannot access application on port 8080
- "Connection refused" errors

**Common Causes:**
1. **Configuration service unavailable**
2. **Database connection issues**
3. **JWT secret misconfiguration**
4. **Resource constraints**

**Diagnosis:**
```bash
# Check pod status and events
kubectl describe pod gateway-pod-name

# Check logs for specific errors
kubectl logs deployment/openframe-gateway -n microservices --tail=50

# Verify config service connectivity
kubectl exec -it gateway-pod -- nslookup openframe-config-server
```

**Solutions:**
```bash
# Restart config service first
kubectl rollout restart deployment/openframe-config -n microservices

# Check config service health
curl http://openframe-config:8888/actuator/health

# Verify JWT configuration
kubectl get secret jwt-secret -o yaml

# Scale up resources if needed
kubectl patch deployment openframe-gateway -p '{"spec":{"template":{"spec":{"containers":[{"name":"gateway","resources":{"requests":{"memory":"1Gi","cpu":"500m"}}}]}}}}'
```

### API Service Connection Errors

**Symptoms:**
- GraphQL endpoint returns 500 errors
- Database connection timeouts
- "Unable to connect to MongoDB" errors

**Diagnosis:**
```bash
# Check database connectivity
kubectl exec -it api-pod -- mongo mongodb://mongodb:27017/openframe

# Check environment variables
kubectl exec -it api-pod -- env | grep -i mongo

# Verify service discovery
kubectl get svc -n datasources
```

**Solutions:**
```bash
# Restart MongoDB if needed
kubectl rollout restart deployment/mongodb -n datasources

# Check MongoDB logs
kubectl logs deployment/mongodb -n datasources

# Verify connection string
kubectl get configmap openframe-config -o yaml | grep mongodb

# Update connection pool settings
kubectl patch deployment openframe-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","env":[{"name":"SPRING_DATA_MONGODB_URI","value":"mongodb://mongodb:27017/openframe?maxPoolSize=50"}]}]}}}}'
```

## Performance Issues

### High Response Times

**Symptoms:**
- API responses > 1 second
- Dashboard loading slowly
- Timeout errors in browser

**Diagnosis:**
```bash
# Check CPU and memory usage
kubectl top pods -n microservices

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/api/health"

# Check database performance
kubectl exec -it mongodb-pod -- mongo --eval "db.runCommand({serverStatus: 1})"
```

**Solutions:**
```bash
# Scale horizontally
kubectl scale deployment openframe-api --replicas=3

# Increase resource limits
kubectl patch deployment openframe-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'

# Enable connection pooling
kubectl set env deployment/openframe-api SPRING_DATA_MONGODB_URI="mongodb://mongodb:27017/openframe?maxPoolSize=100"

# Add caching
kubectl set env deployment/openframe-api SPRING_CACHE_TYPE=redis
```

### Memory Issues

**Symptoms:**
- Pods being OOM killed
- Java heap space errors
- OutOfMemoryError in logs

**Diagnosis:**
```bash
# Check memory usage trends
kubectl top pods --sort-by=memory

# Check pod resource limits
kubectl describe pod pod-name | grep -A 5 -B 5 Limits

# Monitor heap usage
kubectl exec -it java-pod -- jstat -gc 1
```

**Solutions:**
```bash
# Increase memory limits
kubectl patch deployment openframe-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"memory":"4Gi"},"requests":{"memory":"2Gi"}}}]}}}}'

# Tune JVM heap size
kubectl patch deployment openframe-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","env":[{"name":"JAVA_OPTS","value":"-Xmx2g -Xms1g"}]}]}}}}'

# Enable memory monitoring
kubectl patch deployment openframe-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","env":[{"name":"MANAGEMENT_METRICS_EXPORT_PROMETHEUS_ENABLED","value":"true"}]}]}}}}'
```

## Database Issues

### MongoDB Connection Problems

**Symptoms:**
- "No suitable servers found" errors
- Connection timeouts
- Authentication failures

**Diagnosis:**
```bash
# Test MongoDB connectivity
kubectl exec -it test-pod -- mongo mongodb://mongodb:27017/openframe

# Check MongoDB logs
kubectl logs deployment/mongodb -n datasources --tail=100

# Verify service endpoints
kubectl get endpoints mongodb -n datasources
```

**Solutions:**
```bash
# Restart MongoDB
kubectl rollout restart deployment/mongodb -n datasources

# Check MongoDB configuration
kubectl get configmap mongodb-config -o yaml

# Verify network policies
kubectl get networkpolicy -n datasources

# Reset MongoDB authentication
kubectl exec -it mongodb-pod -- mongo --eval "db.dropAllUsers()"
```

### Cassandra Issues

**Symptoms:**
- "All host(s) tried for query failed" errors
- Write timeouts
- Inconsistent read results

**Diagnosis:**
```bash
# Check Cassandra cluster status
kubectl exec -it cassandra-pod -- nodetool status

# Monitor Cassandra logs
kubectl logs deployment/cassandra -n datasources

# Check keyspace configuration
kubectl exec -it cassandra-pod -- cqlsh -e "DESCRIBE KEYSPACES;"
```

**Solutions:**
```bash
# Repair Cassandra cluster
kubectl exec -it cassandra-pod -- nodetool repair

# Adjust replication factor
kubectl exec -it cassandra-pod -- cqlsh -e "ALTER KEYSPACE openframe WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};"

# Increase timeouts
kubectl set env deployment/openframe-stream CASSANDRA_READ_TIMEOUT=10000
```

## Network and Connectivity Issues

### Service Communication Failures

**Symptoms:**
- "Connection refused" between services
- DNS resolution failures
- Intermittent connectivity

**Diagnosis:**
```bash
# Test DNS resolution
kubectl exec -it test-pod -- nslookup service-name.namespace.svc.cluster.local

# Check service endpoints
kubectl get endpoints service-name

# Test connectivity
kubectl exec -it pod1 -- curl -v http://service-name:port/health

# Check network policies
kubectl get networkpolicy --all-namespaces
```

**Solutions:**
```bash
# Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system

# Fix service selector
kubectl patch service service-name -p '{"spec":{"selector":{"app":"correct-label"}}}'

# Update network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-traffic
spec:
  podSelector:
    matchLabels:
      app: openframe-api
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: openframe-gateway
EOF
```

### Load Balancer Issues

**Symptoms:**
- External services unreachable
- SSL certificate errors
- Ingress routing failures

**Diagnosis:**
```bash
# Check ingress status
kubectl get ingress --all-namespaces

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller

# Test SSL certificates
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions:**
```bash
# Restart ingress controller
kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx

# Update certificate
kubectl delete secret tls-secret
kubectl create secret tls tls-secret --cert=cert.pem --key=key.pem

# Fix ingress routing
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openframe-ingress
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: openframe-gateway
            port:
              number: 8080
EOF
```

## Authentication and Security Issues

### JWT Token Problems

**Symptoms:**
- "Invalid token" errors
- Authentication failures
- Token expiration issues

**Diagnosis:**
```bash
# Check JWT secret
kubectl get secret jwt-secret -o jsonpath='{.data.secret}' | base64 -d

# Verify token structure
echo "your-jwt-token" | cut -d. -f2 | base64 -d | jq

# Check token expiration
kubectl logs deployment/openframe-gateway | grep -i "token expired"
```

**Solutions:**
```bash
# Regenerate JWT secret
kubectl delete secret jwt-secret
kubectl create secret generic jwt-secret --from-literal=secret="new-secret-key"

# Restart services that use JWT
kubectl rollout restart deployment/openframe-gateway
kubectl rollout restart deployment/openframe-api

# Update token expiration
kubectl set env deployment/openframe-api JWT_EXPIRATION=3600
```

### OAuth2 Issues

**Symptoms:**
- OAuth2 flow failures
- "Invalid client" errors
- Redirect URI mismatches

**Diagnosis:**
```bash
# Check OAuth2 configuration
kubectl get configmap oauth2-config -o yaml

# Verify client registration
kubectl exec -it api-pod -- mongo openframe --eval "db.oauth_clients.find()"

# Check redirect URIs
curl -v "http://localhost:8080/oauth/authorize?client_id=test&response_type=code&redirect_uri=http://localhost:3000/callback"
```

**Solutions:**
```bash
# Update OAuth2 client
kubectl exec -it api-pod -- mongo openframe --eval 'db.oauth_clients.updateOne({clientId:"client-id"}, {$set:{redirectUris:["http://localhost:3000/callback"]}})'

# Fix client configuration  
kubectl patch configmap oauth2-config -p '{"data":{"client.id":"correct-client-id"}}'

# Restart OAuth2 services
kubectl rollout restart deployment/openframe-api
```

## Quick Recovery Actions

### Emergency Service Restart
```bash
# Restart all core services
kubectl rollout restart deployment/openframe-gateway -n microservices
kubectl rollout restart deployment/openframe-api -n microservices
kubectl rollout restart deployment/openframe-client -n microservices

# Wait for rollout completion
kubectl rollout status deployment/openframe-gateway -n microservices
```

### Database Recovery
```bash
# MongoDB emergency restart
kubectl scale deployment mongodb --replicas=0 -n datasources
kubectl scale deployment mongodb --replicas=1 -n datasources

# Cassandra emergency restart
kubectl delete pod -l app=cassandra -n datasources
kubectl rollout status deployment/cassandra -n datasources
```

### Clear Caches
```bash
# Redis cache clear
kubectl exec -it redis-pod -- redis-cli FLUSHALL

# Application cache clear
curl -X POST http://localhost:8080/actuator/caches
```

## Prevention Strategies

### Monitoring Setup
- Configure comprehensive alerting
- Set up automated health checks
- Implement log aggregation
- Monitor resource utilization trends

### Regular Maintenance
- Update dependencies regularly
- Perform database maintenance
- Clean up old logs and data
- Test backup and recovery procedures

### Capacity Planning
- Monitor resource usage trends
- Plan for traffic growth
- Implement auto-scaling
- Regular performance testing

For issues not covered in this guide, consult the [debugging procedures](debugging.md) or escalate to the development team.