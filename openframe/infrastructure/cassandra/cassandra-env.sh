#!/bin/bash
# Add JMX exporter to Cassandra's JVM options only
export JVM_OPTS="$JVM_OPTS -javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent.jar=9404:/opt/jmx_exporter/config.yml"

# Start Cassandra
exec cassandra -f