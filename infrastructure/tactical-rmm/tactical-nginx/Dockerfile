FROM nginxinc/nginx-unprivileged:stable-alpine

ENV TACTICAL_USER nginx
ENV TACTICAL_USER_ID 1000
ENV TACTICAL_DIR /opt/tactical

USER root

# Install required packages
RUN apk add --no-cache \
    openssl \
    bash \
    gettext

# Create tactical user and set permissions
RUN deluser --remove-home nginx && \
    addgroup -S -g ${TACTICAL_USER_ID} ${TACTICAL_USER} && \
    adduser -S -G ${TACTICAL_USER} -u ${TACTICAL_USER_ID} ${TACTICAL_USER} && \
    mkdir -p ${TACTICAL_DIR}/certs && \
    mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run && \
    chown -R ${TACTICAL_USER}:${TACTICAL_USER} ${TACTICAL_DIR} \
        /var/cache/nginx \
        /var/log/nginx \
        /etc/nginx/conf.d \
        /var/run && \
    chmod -R 755 ${TACTICAL_DIR}/certs

# Copy nginx configurations
COPY nginx.main.conf /etc/nginx/nginx.main.conf
COPY conf.d/ /etc/nginx/conf.d/
RUN chown -R ${TACTICAL_USER}:${TACTICAL_USER} /etc/nginx

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    chown ${TACTICAL_USER}:${TACTICAL_USER} /entrypoint.sh

USER ${TACTICAL_USER}

ENTRYPOINT ["/entrypoint.sh"]
