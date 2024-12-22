# OpenFrame Monitoring

This directory centralizes metrics, dashboards, and alerting configurations. It typically includes:

• Prometheus configuration (prometheus.yml).  
• Grafana dashboards (JSON files, e.g., openframe-gateway-dashboard.json, openframe-api-dashboard.json, cassandra-dashboard.json).  
• Alerting rules.

## Key Files
- prometheus.yml: Sets up scrape configs for each microservice or integrated service.  
- Various *.json dashboards: Provide pre-built metrics visualizations in Grafana.  

## Usage
• Deployed alongside the main OpenFrame stack using docker-compose or Kubernetes.  
• Updates to the dashboards can be done by editing the JSON or using Grafana’s UI, then exporting back to JSON.

## Extensibility
• Add new rules in Prometheus or new Grafana dashboards as microservices expand.  
• Alert rules are typically stored in separate YAML or integrated into the main prometheus.yml.

## Troubleshooting
• Check the Prometheus console to confirm your targets are “UP.”  
• Monitor the Grafana logs if dashboards fail to load or show data.  
• Use alertmanager logs or UI to debug missing or misfired alerts.