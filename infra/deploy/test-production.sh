#!/usr/bin/env bash
# Runs in the disposable Linux CI runner against the verified production build/.
set -euo pipefail
tls=$(mktemp -d)
live=modelsphere-website-production
cleanup() {
  docker rm -f "$live" >/dev/null 2>&1 || true
  rm -rf -- "$tls"
}
trap cleanup EXIT

issue_cert() {
  openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=modelsphere.tech \
    -addext 'subjectAltName=DNS:modelsphere.tech,DNS:www.modelsphere.tech' \
    -keyout "$tls/privkey.pem" -out "$tls/fullchain.pem" 2>/dev/null
}
image=$(docker build -q --target production --label "org.opencontainers.image.revision=$GITHUB_SHA" \
  -f infra/docker/Dockerfile .)
update() {
  sudo env IMAGE="$image" TLS_DIR="$tls" CURL_CA_BUNDLE="$tls/fullchain.pem" bash infra/deploy/update-production.sh
}
fetch_site() {
  curl --noproxy '*' --cacert "$tls/fullchain.pem" --resolve 'modelsphere.tech:443:127.0.0.1' "$@"
}

issue_cert
update
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
