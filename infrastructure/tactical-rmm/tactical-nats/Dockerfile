FROM nats:2.10.7-alpine

USER root

# Create necessary directories
RUN mkdir -p /opt/tactical/nats \
    && mkdir -p /data/jetstream

# Create NATS configuration
RUN echo 'port: 4222\n\
monitor_port: 8222\n\
\n\
jetstream {\n\
    store_dir: "/data/jetstream"\n\
    max_mem: 1G\n\
    max_file: 10G\n\
}\n\
\n\
cluster {\n\
    name: "rmm"\n\
    listen: "0.0.0.0:6222"\n\
    routes: ["nats://127.0.0.1:6222"]\n\
}\n' > /opt/tactical/nats/nats-rmm.conf \
    && chown -R nats:nats /opt/tactical/nats /data/jetstream \
    && chmod -R 755 /opt/tactical/nats /data/jetstream

USER nats

ENTRYPOINT ["nats-server", "--config", "/opt/tactical/nats/nats-rmm.conf"]
