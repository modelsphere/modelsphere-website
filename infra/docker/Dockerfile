FROM nginxinc/nginx-unprivileged:1.28.0-alpine
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html/
USER 101
EXPOSE 8080
