# OpenFrame Stream

OpenFrame Stream handles data ingestion, processing, and real-time transformations of events using technologies like Apache NiFi or Kafka.

## Purpose
• Acquire data from various sources (logs, IoT, APIs).  
• Apply transformations, validations, or enrichments via NiFi flows.  
• Publish processed events to Kafka, storing them in Cassandra or Pinot for analytics.

## Key Files
- Dockerfile: Instructions for building the stream service container.  
- pom.xml (if Java-based NiFi components or custom processors are included).  

## Running
1. Make sure Kafka and Zookeeper are up (docker-compose.openframe-infrastructure.yml).  
2. Spin up NiFi or the stream processors:  
   » docker-compose up -d openframe-stream  

## Configuration
• openframe-stream.yml or openframe-stream-local.yml for environment-specific settings.  
• NiFi flows or custom processors are typically referenced in infrastructure/nifi/ or a similar path.

## Troubleshooting
• Check NiFi logs or Kafka logs for errors in data pipelines.  
• Validate that relevant topics exist in Kafka.

## Metrics & Monitoring
• NiFi can expose metrics or be integrated into Prometheus.  
• NiFi “backpressure” conditions might trigger alerts defined in the openframe/monitoring setup. 