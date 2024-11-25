#!/bin/bash

# Create monitoring directory structure
mkdir -p monitoring/prometheus/rules
mkdir -p monitoring/grafana/provisioning/{dashboards,datasources}

# Copy Prometheus config
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'openframe-api'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['api:8090']

  - job_name: 'openframe-core'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['core:8091']

  - job_name: 'openframe-stream'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['stream:8082']

  - job_name: 'openframe-data'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['data:8083']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka:9308']

  - job_name: 'zookeeper'
    static_configs:
      - targets: ['zookeeper:7070']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'cassandra'
    static_configs:
      - targets: ['cassandra:9404']

  - job_name: 'nifi'
    static_configs:
      - targets: ['nifi:8443']
EOF

# Copy alert rules
cat > monitoring/prometheus/rules/alert.rules << 'EOF'
groups:
- name: OpenFrame
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.instance }} is down"
      description: "{{ $labels.instance }} has been down for more than 1 minute."
EOF

echo "Monitoring configuration initialized successfully!"
