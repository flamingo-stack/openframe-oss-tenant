FROM nginx:latest

# Install required packages
RUN apt-get update && apt-get install -y openssl curl gettext && rm -rf /var/lib/apt/lists/*

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy configuration files
COPY nginx.conf /tmp/nginx.conf
COPY conf.d/ /tmp/conf.d/
COPY ssl/openssl.cnf.template /tmp/openssl.cnf.template
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"] 