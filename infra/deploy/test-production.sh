#!/usr/bin/env bash
# Runs in the disposable Linux CI runner against the verified production build/.
set -euo pipefail
tls=$(mktemp -d)
live=modelsphere-website-production
edge=modelsphere-ci-public-nginx
origin=https://modelsphere.tech:18443
cleanup() {
  docker rm -f "$live" "$edge" >/dev/null 2>&1 || true
  rm -rf -- "$tls"
}
trap cleanup EXIT

issue_cert() {
  openssl req -new -newkey rsa:2048 -nodes -subj /CN=modelsphere.tech \
    -keyout "$tls/privkey.pem" -out "$tls/request.csr" 2>/dev/null
  openssl x509 -req -in "$tls/request.csr" -CA "$tls/ca.pem" -CAkey "$tls/ca.key" \
    -CAcreateserial -days 1 -extfile <(printf '%s\n' 'subjectAltName=DNS:modelsphere.tech') \
    -out "$tls/fullchain.pem" 2>/dev/null
}
image=$(docker build -q --target production --label "org.opencontainers.image.revision=$GITHUB_SHA" \
  -f infra/docker/Dockerfile .)
update() {
  sudo env IMAGE="$image" TLS_DIR="$tls" CURL_CA_BUNDLE="$tls/ca.pem" bash infra/deploy/update-production.sh
}
fetch_site() {
  curl --noproxy '*' --cacert "$tls/ca.pem" --resolve 'modelsphere.tech:443:127.0.0.1' \
    --resolve 'modelsphere.tech:18443:127.0.0.1' "$@"
}

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=CI-root \
  -addext 'basicConstraints=critical,CA:TRUE' -keyout "$tls/ca.key" -out "$tls/ca.pem" 2>/dev/null
issue_cert
# The shared ingress owns both public ports before the updater starts.
mkdir "$tls/edge-conf" "$tls/edge-tls"
cp "$tls/fullchain.pem" "$tls/privkey.pem" "$tls/ca.pem" "$tls/edge-tls/"
cat >"$tls/edge-conf/site.conf" <<'NGINX'
server {
    listen 80;
    return 308 https://modelsphere.tech$request_uri;
}
server {
    listen 443 ssl;
    server_name modelsphere.tech;
    ssl_certificate /test-tls/fullchain.pem;
    ssl_certificate_key /test-tls/privkey.pem;
    location / {
        proxy_pass https://127.0.0.1:18443;
        proxy_set_header Host $host;
        proxy_ssl_server_name on;
        proxy_ssl_name modelsphere.tech;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /test-tls/ca.pem;
    }
}
NGINX
docker run -d --name "$edge" --network host --user 0 --cap-add NET_BIND_SERVICE \
  -v "$tls/edge-conf:/etc/nginx/conf.d:ro" -v "$tls/edge-tls:/test-tls:ro" "$image" >/dev/null
curl --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 -sS http://127.0.0.1/ >/dev/null
# A previous deployment may have been stopped to free the public ports.
docker create --name "$live" --label tech.modelsphere.production-updater=yes \
  -p 80:8080 -p 443:8443 "$image" >/dev/null
update
[[ $(docker port "$live") == '8443/tcp -> 127.0.0.1:18443' ]]
fetch_site -fsS "$origin/version.json" | jq -e --arg sha "$GITHUB_SHA" '.commit == $sha'
first=$(docker inspect -f '{{.Id}}' "$live")
[[ $(curl --noproxy '*' -sSo /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1/docs?from=ci') == '308 https://modelsphere.tech/docs?from=ci' ]]
[[ $(fetch_site -sSo /dev/null -w '%{http_code} %{redirect_url}' -H 'Accept-Language: en-US,en;q=0.9' https://modelsphere.tech/docs) == '302 https://modelsphere.tech/en/docs?ms_auto=en' ]]
fetch_site -fsS https://modelsphere.tech/version.json | jq -e --arg sha "$GITHUB_SHA" '.commit == $sha'
update
[[ $(docker inspect -f '{{.Id}}' "$live") == "$first" ]]

# A broken renewal cannot displace the serving certificate. A valid renewal
# on the very same image must take effect on the next update.
openssl genrsa -out "$tls/privkey.pem" 2048 2>/dev/null
if update; then echo 'Mismatched private key was accepted' >&2; exit 1; fi
[[ $(docker inspect -f '{{.Id}}' "$live") == "$first" ]]
fetch_site -fsS https://modelsphere.tech/version.json >/dev/null
issue_cert
update
[[ $(docker inspect -f '{{.Id}}' "$live") != "$first" ]]
fetch_site -fsS https://modelsphere.tech/version.json >/dev/null
