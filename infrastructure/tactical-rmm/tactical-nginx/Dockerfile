FROM nginx:1.26.2

# Install required packages
RUN apt-get update && \
    apt-get install -y netcat-traditional gettext && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/run && \
    mkdir -p /docker-entrypoint.d && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /var/run

# Copy configuration files to temporary location
COPY tactical-nginx/nginx.conf /tmp/nginx.conf
COPY tactical-nginx/default.conf /tmp/conf.d/default.conf
COPY tactical-nginx/init-tactical.sh /docker-entrypoint.d/40-init-tactical.sh

RUN chmod +x /docker-entrypoint.d/40-init-tactical.sh