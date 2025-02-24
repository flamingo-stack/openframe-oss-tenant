FROM apache/nifi:latest

# Install wget and download JMX Exporter
RUN mkdir -p /opt/nifi/jmx_exporter && \
    apt-get update && \
    apt-get install -y wget && \
    wget -O /opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.20.0/jmx_prometheus_javaagent-0.20.0.jar && \
    rm -rf /var/lib/apt/lists/*

# Create config directory and add config file
COPY config.yml /opt/nifi/jmx_exporter/config.yml

# Update NIFI_JVM_ARGS in bootstrap.conf
RUN echo "java.arg.100=-javaagent:/opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar=9096:/opt/nifi/jmx_exporter/config.yml" >> /opt/nifi/nifi-current/conf/bootstrap.conf
