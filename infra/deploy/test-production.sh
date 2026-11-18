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
  sudo env IMAGE="$image" CURL_CA_BUNDLE="$tls/ca.pem" "$@" bash infra/deploy/update-production.sh
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
sed -e 's|/etc/modelsphere-website/tls-paths/|/test-tls/|g' \
    -e 's|/etc/ssl/certs/ca-certificates.crt|/test-tls/ca.pem|g' \
    infra/deploy/modelsphere.tech.conf >"$tls/edge-conf/site.conf"
docker run -d --name "$edge" --network host --user 0 --cap-add NET_BIND_SERVICE \
  -v "$tls/edge-conf:/etc/nginx/conf.d:ro" -v "$tls/edge-tls:/test-tls:ro" "$image" >/dev/null
curl --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 -sS http://127.0.0.1/ >/dev/null
# A previous deployment may have been stopped to free the public ports.
docker create --name "$live" --label tech.modelsphere.production-updater=yes \
  -p 80:8080 -p 443:8443 "$image" >/dev/null
# Exercise the original TLS_DIR interface before installing central paths.
update TLS_DIR="$tls"
[[ $(docker port "$live") == '8443/tcp -> 127.0.0.1:18443' ]]
fetch_site -fsS "$origin/version.json" | jq -e --arg sha "$GITHUB_SHA" '.commit == $sha'
first=$(docker inspect -f '{{.Id}}' "$live")
cert_dir="$tls/managed certs"
key_dir="$tls/managed keys"
mkdir "$cert_dir" "$key_dir"
cp "$tls/fullchain.pem" "$cert_dir/v1.pem"
cp "$tls/privkey.pem" "$key_dir/v1.key"
ln -s v1.pem "$cert_dir/modelsphere.tech_bundle.pem"
ln -s v1.key "$key_dir/modelsphere.tech.key"
configure=(sudo bash infra/deploy/update-production.sh --configure-tls)
"${configure[@]}" "$cert_dir/modelsphere.tech_bundle.pem" "$key_dir/modelsphere.tech.key"
paths=/etc/modelsphere-website/tls-paths
pair=$(sudo readlink "$paths")
"${configure[@]}" "$cert_dir/modelsphere.tech_bundle.pem" "$key_dir/modelsphere.tech.key"
if "${configure[@]}" "$cert_dir/modelsphere.tech_bundle.pem" "$key_dir/missing"; then exit 1; fi
[[ $(sudo readlink "$paths") == "$pair" ]]
[[ $(sudo readlink "$paths/privkey.pem") == "$key_dir/modelsphere.tech.key" ]]
[[ $(curl --noproxy '*' -sSo /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1/docs?from=ci') == '308 https://modelsphere.tech/docs?from=ci' ]]
[[ $(fetch_site -sSo /dev/null -w '%{http_code} %{redirect_url}' -H 'Accept-Language: en-US,en;q=0.9' https://modelsphere.tech/docs) == '302 https://modelsphere.tech/en/docs?ms_auto=en' ]]
fetch_site -fsS https://modelsphere.tech/version.json | jq -e --arg sha "$GITHUB_SHA" '.commit == $sha'
update
[[ $(docker inspect -f '{{.Id}}' "$live") == "$first" ]]

# A broken renewal cannot displace the serving certificate. A valid renewal
# on the very same image must take effect on the next update.
openssl genrsa -out "$key_dir/invalid.key" 2048 2>/dev/null
ln -sfn invalid.key "$key_dir/modelsphere.tech.key"
if update; then echo 'Mismatched private key was accepted' >&2; exit 1; fi
[[ $(docker inspect -f '{{.Id}}' "$live") == "$first" ]]
fetch_site -fsS https://modelsphere.tech/version.json >/dev/null
issue_cert
cp "$tls/fullchain.pem" "$cert_dir/v2.pem"
cp "$tls/privkey.pem" "$key_dir/v2.key"
ln -sfn v2.pem "$cert_dir/modelsphere.tech_bundle.pem"
ln -sfn v2.key "$key_dir/modelsphere.tech.key"
update
[[ $(docker inspect -f '{{.Id}}' "$live") != "$first" ]]
fetch_site -fsS https://modelsphere.tech/version.json >/dev/null
