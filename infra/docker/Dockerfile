FROM nginxinc/nginx-unprivileged:1.28.0-alpine AS http
ARG SITE_BASE_URL=/
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html${SITE_BASE_URL}
USER root
RUN sed -i "s|__SITE_BASE__|${SITE_BASE_URL}|g; s|error_page 404 /404.html|error_page 404 ${SITE_BASE_URL}404.html|; s|location = /404.html|location = ${SITE_BASE_URL}404.html|" /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080

FROM http AS production
USER root
RUN sed -i 's/listen 8080;/listen 8443 ssl default_server;/' /etc/nginx/conf.d/default.conf
COPY infra/docker/https.conf /etc/nginx/conf.d/https.conf
USER 101
EXPOSE 8443

# Local builds and develop continue to serve HTTP without a certificate.
FROM http AS development
