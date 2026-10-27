FROM nginxinc/nginx-unprivileged:1.28.0-alpine
ARG SITE_BASE_URL=/
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html${SITE_BASE_URL}
USER root
RUN sed -i "s|error_page 404 /404.html|error_page 404 ${SITE_BASE_URL}404.html|; s|location = /404.html|location = ${SITE_BASE_URL}404.html|" /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
