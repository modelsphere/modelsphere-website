#!/usr/bin/env bash
# Run once as root on a Linux Docker host, or periodically from root's crontab.
set -euo pipefail
umask 077

registry=crpi-m351n5ri6g6oankf.cn-beijing.personal.cr.aliyuncs.com
image=${IMAGE:-$registry/ct-modelsphere/modelsphere-website:production}
tls_dir=${TLS_DIR:-/etc/letsencrypt/live/modelsphere.tech}
state=/var/lib/modelsphere-website-production
site=modelsphere.tech
backend_port=18443
live=modelsphere-website-production
previous=$live-previous
probe=$live-check
owner=tech.modelsphere.production-updater
cert_label=tech.modelsphere.tls-snapshot
die() { echo "$*" >&2; exit 1; }
exists() { docker container inspect "$1" >/dev/null 2>&1; }

backend_only() {
  docker inspect -f '{{json .HostConfig.PortBindings}}' "$1" |
    jq -e --arg port "$backend_port" '. == {"8443/tcp": [{"HostIp":"127.0.0.1","HostPort":$port}]}' >/dev/null
}

(( EUID == 0 )) || die 'Run this updater as root.'
install -d -m 0700 "$state"
exec 9>"$state/update.lock"
flock -n 9 || exit 0
docker info >/dev/null
for name in "$live" "$previous" "$probe"; do
  if exists "$name"; then
    managed=$(docker inspect -f "{{index .Config.Labels \"$owner\"}}" "$name")
    [[ $managed == yes ]] || die "Container name is already in use: $name"
  fi
done

restore_previous() {
  if exists "$live"; then docker rm -f "$live" >/dev/null || return 1; fi
  docker rename "$previous" "$live" || return 1
  # A legacy container retains its original running/stopped state during migration.
  if backend_only "$live"; then docker start "$live" >/dev/null || return 1; fi
  echo 'Restored previous production container.' >&2
}
# Recover an interrupted switch before checking the registry or credentials.
if exists "$previous"; then restore_previous; fi
if exists "$probe"; then docker rm -f "$probe" >/dev/null; fi
if exists "$live" && backend_only "$live"; then docker start "$live" >/dev/null; fi

# Local Docker image IDs also support offline rollback and the CI smoke test.
if [[ ! $image =~ ^sha256:[0-9a-f]{64}$ ]]; then docker pull "$image"; fi
image_id=$(docker image inspect -f '{{.Id}}' "$image")
revision=$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id")
[[ $revision =~ ^[a-f0-9]{40}$ ]] || die 'Image missing a valid Git revision.'

# Snapshot the resolved PEM files together so renewal cannot change a running
# container's files or its rollback copy. Only the non-root Nginx UID can read the key.
stage=$(mktemp -d "$state/stage.XXXXXXXX")
switching=0
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  set +e
  if exists "$probe"; then docker rm -f "$probe" >/dev/null; fi
  if (( switching )); then
    if exists "$previous"; then restore_previous || echo 'Rollback failed; inspect the previous container.' >&2
    elif exists "$live"; then docker rm -f "$live" >/dev/null
    fi
  fi
  rm -rf -- "$stage"
  # Keep certificates used by either side of an interrupted switch.
  local keep_live keep_previous dir
  keep_live=$(docker inspect -f "{{index .Config.Labels \"$cert_label\"}}" "$live" 2>/dev/null || true)
  keep_previous=$(docker inspect -f "{{index .Config.Labels \"$cert_label\"}}" "$previous" 2>/dev/null || true)
  for dir in "$state"/tls-*; do
    [[ -d $dir && ${dir##*/} != "$keep_live" && ${dir##*/} != "$keep_previous" ]] || continue
    # Docker must confirm the directory has no remaining container mounts.
    local mounts
    mounts=$(docker ps -aq --filter "volume=$dir") && [[ -z $mounts ]] && rm -rf -- "$dir"
  done
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
install -m 0444 "$tls_dir/fullchain.pem" "$stage/fullchain.pem"
install -o 101 -m 0400 "$tls_dir/privkey.pem" "$stage/privkey.pem"
chown 101 "$stage"
chmod 0500 "$stage"
fingerprint=$(cd "$stage" && sha256sum fullchain.pem privkey.pem | sha256sum)
snapshot=tls-${fingerprint%% *}
certs=$state/$snapshot
if [[ ! -d $certs ]]; then mv "$stage" "$certs"; fi

healthy() {
  local port=$1 body
  body=$(curl --noproxy '*' -fsS --connect-timeout 2 --max-time 4 \
    --resolve "$site:$port:127.0.0.1" "https://$site:$port/version.json") || return 1
  jq -e --arg sha "$revision" '.commit == $sha and .target == "release" and .baseUrl == "/"' <<<"$body" >/dev/null
}
wait_healthy() {
  local port=$1
  for ((i=0; i<10; i++)); do
    if healthy "$port" 2>/dev/null; then return 0; fi
    sleep 1
  done
  healthy "$port"
}
if exists "$live" && backend_only "$live" && [[ $(docker inspect -f "{{.Image}} {{index .Config.Labels \"$cert_label\"}}" "$live") == "$image_id $snapshot" ]] && healthy "$backend_port"; then
  exit 0
fi
options=(--label "$owner=yes" --label "$cert_label=$snapshot" --mount "type=bind,src=$certs,dst=/etc/modelsphere/tls,readonly")
docker run -d --name "$probe" "${options[@]}" -p 127.0.0.1::8443 "$image_id" >/dev/null
port=$(docker port "$probe" 8443/tcp)
wait_healthy "${port##*:}" || die 'Candidate failed HTTPS/version check.'
docker rm -f "$probe" >/dev/null

if exists "$live"; then
  docker rename "$live" "$previous"
  switching=1
  # A legacy 80/443 container can coexist until the new backend is healthy.
  if backend_only "$previous"; then docker stop "$previous" >/dev/null; fi
else
  switching=1
fi
docker run -d --name "$live" --restart unless-stopped "${options[@]}" \
  -p "127.0.0.1:$backend_port:8443" "$image_id" >/dev/null
wait_healthy "$backend_port" || die 'Published port failed HTTPS/version check.'
switching=0
if exists "$previous"; then docker rm -f "$previous" >/dev/null; fi
echo "Serving $site on https://127.0.0.1:$backend_port at $revision"
