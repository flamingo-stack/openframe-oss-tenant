FROM nginx:1.26.2

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates

RUN apt-get update && \
    apt-get install -y netcat-traditional && \
    rm -rf /var/lib/apt/lists/*

COPY tactical-nginx/nginx.conf /etc/nginx/nginx.conf
COPY tactical-nginx/default.conf /etc/nginx/conf.d/default.conf