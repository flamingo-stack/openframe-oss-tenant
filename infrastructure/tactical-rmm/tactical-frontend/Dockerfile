FROM nginx:1.25.3-alpine

ENV PUBLIC_DIR /usr/share/nginx/html

# Install required packages
RUN apk add --no-cache bash

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    && chown -R nginx:nginx /var/cache/nginx \
    && chmod -R 755 /var/cache/nginx \
    && mkdir -p ${PUBLIC_DIR} \
    && chown -R nginx:nginx /usr/share/nginx \
    && chmod -R 755 ${PUBLIC_DIR} \
    && touch ${PUBLIC_DIR}/env-config.js \
    && chown nginx:nginx ${PUBLIC_DIR}/env-config.js \
    && chmod 644 ${PUBLIC_DIR}/env-config.js

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY ./entrypoint.sh /
RUN chmod +x /entrypoint.sh \
    && chown nginx:nginx /entrypoint.sh

USER nginx

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
