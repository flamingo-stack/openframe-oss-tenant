FROM --platform=$BUILDPLATFORM apache/nifi:latest

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

# Add JMX Exporter
COPY jmx_prometheus_javaagent.jar /opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar

# Create config directory and add config file
COPY config.yml /opt/nifi/jmx_exporter/config.yml

# Update NIFI_JVM_ARGS in bootstrap.conf
RUN echo "java.arg.100=-javaagent:/opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar=9096:/opt/nifi/jmx_exporter/config.yml" >> /opt/nifi/nifi-current/conf/bootstrap.conf

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD pgrep java || exit 1
