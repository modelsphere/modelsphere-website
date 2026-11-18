# 首次部署与自动更新

生产服务器使用 Linux、rootful Docker、Bash、curl（系统 CA）、jq、flock 和 GNU coreutils。更新脚本由 root 运行。容器内的 Nginx 用 UID 101 读取只读挂载的证书。服务器需要能访问阿里云 ACR。官网容器只发布 `127.0.0.1:18443 → 8443/tcp`，运维管理同一台宿主机上的公网 80/443 入口。

1. 安装更新脚本，并用具有镜像拉取权限的账号登录仓库。

```sh
sudo install -m 0755 update-production.sh /usr/local/sbin/modelsphere-website-production-update
sudo docker login crpi-m351n5ri6g6oankf.cn-beijing.personal.cr.aliyuncs.com
```

2. 运维首次登记两条**宿主机上的绝对路径**，分别指向覆盖 `modelsphere.tech` 的 PEM 证书链和配套私钥。将示例替换为统一证书系统里的真实路径，可以使用不同的目录、原始文件名和续期软链接。

```sh
# 证书链文件（PEM，含站点证书和中间证书）
CERT_CHAIN_PATH='/统一证书目录/modelsphere.tech_bundle.pem'
# 与该证书配对的私钥文件（PEM）
PRIVATE_KEY_PATH='/统一私钥目录/modelsphere.tech.key'

sudo /usr/local/sbin/modelsphere-website-production-update \
  --configure-tls "$CERT_CHAIN_PATH" "$PRIVATE_KEY_PATH"
```

该命令只保存两个路径引用。入口 Nginx 和更新脚本均可通过 `/etc/modelsphere-website/tls-paths/fullchain.pem` 和 `privkey.pem` 读取当前证书。后续路径有变化时再执行此命令。旧安装在登记路径之前仍按原有的 `TLS_DIR` 或 Let's Encrypt 默认目录工作。登记后，手动运行和 cron 均优先使用已登记的路径。

3. 首次更新执行以下命令。脚本在宿主机生成仅包含本站证书链与私钥的受限快照，作为只读挂载提供给容器内的 Nginx。快照用于候选检查和回退，私钥不会写入镜像层。

```sh
sudo /usr/local/sbin/modelsphere-website-production-update
```

4. 首次成功后，将下列内容保存为 `/etc/cron.d/modelsphere-website-production`（root 所有，0644，文件末尾换行）。证书续期仍由证书系统负责；入口按现有流程 reload，应用在下次定时检查时加载新证书。

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

在现有入口 Nginx 中为官网增加独立的虚拟主机。以下示例假设入口运行在宿主机网络内；示例中的证书引用由第 2 步创建，系统 CA 路径请按操作系统调整。如果入口自身在独立容器网络内，它的 `127.0.0.1` 指向入口容器，需要先确认到宿主机回环端口的代理方式。

[下载入口 Nginx 配置](./modelsphere.tech.conf)。

配置入口并验证后，由运维将域名解析指向公网入口。切 DNS 前可在客户端指定入口 IP 测试：

```sh
curl --resolve 'modelsphere.tech:443:入口公网IP' https://modelsphere.tech/version.json
curl -sSI --resolve 'modelsphere.tech:443:入口公网IP' -H 'Accept-Language: en-US' https://modelsphere.tech/docs
```

版本应等于 `main` 的完整提交 SHA；英文入口应返回 302 至 `/en/docs?ms_auto=en`。验证后再切换域名解析。需要临时固定旧版时，暂停对应 cron 条目，用 `sudo env IMAGE=仓库地址:production-sha-完整main提交号 /usr/local/sbin/modelsphere-website-production-update` 部署。修复后恢复 cron。
