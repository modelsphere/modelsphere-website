# 首次部署与自动更新

生产服务器使用 Linux、rootful Docker、Bash、curl（系统 CA）、jq、flock 和 GNU coreutils。更新脚本由 root 运行。容器内的 Nginx 用 UID 101 读取只读挂载的证书。服务器需要能访问阿里云 ACR。官网容器只发布 `127.0.0.1:18443 → 8443/tcp`，运维管理同一台宿主机上的公网 80/443 入口。

1. 在服务器上准备覆盖 `modelsphere.tech` 的可信证书链和私钥，默认读取 `/etc/letsencrypt/live/modelsphere.tech/fullchain.pem` 与 `privkey.pem`。已有 PEM 证书也可以放在自选目录，通过 `TLS_DIR` 指定。例如将域名证书包 `modelsphere.tech_bundle.pem` 和配套的 `modelsphere.tech.key` 分别以 `fullchain.pem` 和 `privkey.pem` 提供给脚本。由现有证书工具负责签发和续期。
2. 从已验收的发布提交下载 `infra/deploy/update-production.sh`，在脚本所在目录执行以下命令。私有仓库通过 `sudo docker login` 交互输入拉取凭据；脚本与 cron 使用同一个 root Docker 配置。

```sh
sudo docker login crpi-m351n5ri6g6oankf.cn-beijing.personal.cr.aliyuncs.com
sudo install -m 0755 update-production.sh /usr/local/sbin/modelsphere-website-production-update
sudo /usr/local/sbin/modelsphere-website-production-update
```

3. 首次成功后，将下列内容保存为 `/etc/cron.d/modelsphere-website-production`（root 所有，0644，文件末尾换行）。如使用自选证书目录，在首次命令及 cron 中都设置 `TLS_DIR`。

```cron
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
*/5 * * * * root /usr/local/sbin/modelsphere-website-production-update >>/var/log/modelsphere-website-production.log 2>&1
```

每次检查拉取 `:production` 并固定本地镜像 ID。镜像、证书和端口映射都相同时复用当前容器。更新时先在临时本机端口验证证书信任链、域名和 `/version.json`，再切到本机 18443 并复验。切换时有短暂停顿；正式端口检查失败会恢复旧容器。证书在宿主机续期后，下一次检查会加载新证书。证书与私钥不进入仓库、镜像或 GitHub Secrets。

## 验证官网容器

在服务器上执行。保留 URL 中的域名可以验证证书并向 Nginx 发送正确的 TLS 服务器名称。

```sh
docker port modelsphere-website-production
curl --noproxy '*' --resolve 'modelsphere.tech:18443:127.0.0.1' https://modelsphere.tech:18443/version.json
```

端口输出应只有 `8443/tcp -> 127.0.0.1:18443`，版本应与本次发布的 `main` 提交一致。

## 公网入口（运维配置）

在现有入口 Nginx 中为官网增加独立的虚拟主机。以下示例假设入口运行在宿主机网络内；证书路径和系统 CA 路径由运维按实际环境填写。如果入口自身在独立容器网络内，它的 `127.0.0.1` 指向入口容器，需要先确认到宿主机回环端口的代理方式。

```nginx
server {
    listen 80;
    server_name modelsphere.tech;
    return 308 https://modelsphere.tech$request_uri;
}

server {
    listen 443 ssl;
    server_name modelsphere.tech;
    ssl_certificate /path/to/edge/fullchain.pem;
    ssl_certificate_key /path/to/edge/privkey.pem;

    location / {
        proxy_pass https://127.0.0.1:18443;
        proxy_set_header Host $host;
        proxy_ssl_server_name on;
        proxy_ssl_name modelsphere.tech;
        proxy_ssl_verify on;
        proxy_ssl_verify_depth 4;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    }
}
```

配置入口并验证后，由运维将域名解析指向公网入口。切 DNS 前可在客户端指定入口 IP 测试：

```sh
curl --resolve 'modelsphere.tech:443:入口公网IP' https://modelsphere.tech/version.json
curl -sSI --resolve 'modelsphere.tech:443:入口公网IP' -H 'Accept-Language: en-US' https://modelsphere.tech/docs
```

版本应等于 `main` 的完整提交 SHA；英文入口应返回 302 至 `/en/docs?ms_auto=en`。验证后再切换域名解析。需要临时固定旧版时，暂停对应 cron 条目，用 `sudo env IMAGE=仓库地址:production-sha-完整main提交号 /usr/local/sbin/modelsphere-website-production-update` 部署。修复后恢复 cron。
