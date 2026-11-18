# 首次部署与自动更新

生产服务器使用 Linux、rootful Docker、Bash、curl（系统 CA）、jq、flock 和 GNU coreutils。更新脚本由 root 运行。容器内的 Nginx 用 UID 101 读取只读挂载的证书。服务器需要能访问阿里云 ACR，公网 80 和 443 由本容器监听。

1. 在服务器上准备覆盖 `modelsphere.tech` 的可信证书链和私钥，默认读取 `/etc/letsencrypt/live/modelsphere.tech/fullchain.pem` 与 `privkey.pem`。已有 PEM 证书也可以放在自选目录，通过 `TLS_DIR` 指定。需要 `www` 跳转时证书还应覆盖 `www.modelsphere.tech`。由现有证书工具负责签发和续期。
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

每次检查拉取 `:production` 并固定本地镜像 ID。代码与证书都相同时复用当前容器。任一变化时，先在临时本机端口验证证书信任链、域名和 `/version.json`，然后在 80/443 重建容器。切换时有短暂停顿；正式端口检查失败会恢复旧容器。证书在宿主机续期后，下一次检查会加载新证书。证书与私钥不进入仓库、镜像或 GitHub Secrets。

首次切流前，先验证新机器：

```sh
curl --resolve 'modelsphere.tech:443:服务器公网IP' https://modelsphere.tech/version.json
curl -sSI --resolve 'modelsphere.tech:443:服务器公网IP' -H 'Accept-Language: en-US' https://modelsphere.tech/docs
```

版本应等于 `main` 的完整提交 SHA；英文入口应返回 302 至 `/en/docs?ms_auto=en`。验证后再切换域名解析。需要临时固定旧版时，暂停对应 cron 条目，用 `sudo env IMAGE=仓库地址:production-sha-完整main提交号 /usr/local/sbin/modelsphere-website-production-update` 部署。修复后恢复 cron。
