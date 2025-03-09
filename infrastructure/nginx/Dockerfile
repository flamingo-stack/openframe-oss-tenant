FROM nginx:latest

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Generate self-signed certificate at container startup
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"] 