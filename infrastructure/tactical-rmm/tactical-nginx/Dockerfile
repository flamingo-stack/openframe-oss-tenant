FROM nginx:1.26.2

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates

RUN apt-get update && \
    apt-get install -y netcat-traditional && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/run && \
    mkdir -p /docker-entrypoint.d && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /var/run

COPY tactical-nginx/nginx.conf /etc/nginx/nginx.conf
COPY tactical-nginx/default.conf /etc/nginx/conf.d/default.conf
COPY tactical-nginx/init-tactical.sh /docker-entrypoint.d/40-init-tactical.sh

RUN chmod +x /docker-entrypoint.d/40-init-tactical.sh