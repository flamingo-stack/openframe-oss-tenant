FROM apache/nifi:latest

# Add JMX Exporter
COPY jmx_prometheus_javaagent.jar /opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar

# Create config directory and add config file
COPY config.yml /opt/nifi/jmx_exporter/config.yml

# Update NIFI_JVM_ARGS in bootstrap.conf
RUN echo "java.arg.100=-javaagent:/opt/nifi/jmx_exporter/jmx_prometheus_javaagent.jar=9096:/opt/nifi/jmx_exporter/config.yml" >> /opt/nifi/nifi-current/conf/bootstrap.conf