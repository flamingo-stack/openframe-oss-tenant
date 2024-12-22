FROM cassandra:4.1.7

USER root

# Install additional useful packages
RUN apt-get update && \
    apt-get install -y \
    curl \
    wget \
    netcat \
    dnsutils \
    net-tools \
    htop \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up JMX authentication
RUN mkdir -p /etc/cassandra && \
    echo "monitorRole QED" > /etc/cassandra/jmxremote.password && \
    echo "controlRole R&D" >> /etc/cassandra/jmxremote.password && \
    echo "cassandra cassandra" >> /etc/cassandra/jmxremote.password && \
    chmod 400 /etc/cassandra/jmxremote.password && \
    chown -R cassandra:cassandra /etc/cassandra && \
    echo "monitorRole readonly" > /etc/cassandra/jmxremote.access && \
    echo "controlRole readwrite" >> /etc/cassandra/jmxremote.access && \
    echo "cassandra readwrite" >> /etc/cassandra/jmxremote.access && \
    chmod 400 /etc/cassandra/jmxremote.access && \
    chown -R cassandra:cassandra /etc/cassandra/jmxremote.access

# Add JMX exporter configuration to cassandra-env.sh
RUN echo 'JVM_OPTS="$JVM_OPTS -javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent.jar=9404:/opt/jmx_exporter/config.yml"' >> /etc/cassandra/cassandra-env.sh

USER cassandra