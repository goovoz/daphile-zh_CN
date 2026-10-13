# 部署指南

## 前置

- SSH 能连到设备
- `python3` 可用（Daphile 自带 3.13）
- 确认 LMS 版本：

```bash
ssh daphile 'grep -m1 "Starting Lyrion Music Server" /var/daphile/mediaserver/log/server.log'
```

---

## 一、首次部署

### 1. 主 strings.txt

```bash
# 取回当前文件（★ 必须取"实机当前版本"，不要用上游原始副本，
#   否则会覆盖掉之前已有的补丁）
scp daphile:/opt/mediaserver/strings.txt ./strings-remote.txt

# 打补丁
python3 scripts/patch-strings.py strings-remote.txt glossary/lms-core.json

# 校验：必须是 LF，且条目数增加
grep -c $'\r' strings-remote.txt   # 应输出 0
grep -c ZH_CN strings-remote.txt  # 应比部署前多

# 传回
scp strings-remote.txt daphile:/opt/mediaserver/strings.txt
```

### 2. DOM 翻译层（两份）

```bash
scp web/zh-cn.js daphile:/var/www/localhost/htdocs/js/zh-cn.js
scp web/zh-cn.js daphile:/opt/mediaserver/HTML/Daphile/js/zh-cn.js
```

> 为什么要两份：80 端口（lighttpd）与 9000 端口（LMS）webroot 不共享。
> 插件设置页走 9000 端口。详见 [architecture.md](architecture.md#二zh-cnjs-注入点必须部署两份)。

### 3. 插件同步器

```bash
scp scripts/zh-plugin-sync.py daphile:/usr/local/bin/zh-plugin-sync
scp glossary/plugins.json      daphile:/var/daphile/zh-plugin-zh.json
ssh daphile 'chmod +x /usr/local/bin/zh-plugin-sync && zh-plugin-sync'
```

### 4. 开机自启

编辑 `daphile:/etc/init.d/mediaserver`，在 `start_pre()` 末尾追加：

```sh
    # [daphile-zh] 插件汉化自动同步
    # 必须在 LMS 启动前跑（strings.txt 是启动时读入内存的）。
    # 加 timeout + 忽略失败，绝不阻塞服务启动。
    if [ -x /usr/local/bin/zh-plugin-sync ]; then
        timeout 30 /usr/local/bin/zh-plugin-sync >/dev/null 2>&1 || true
    fi
```

```bash
ssh daphile 'sh -n /etc/init.d/mediaserver'   # 语法检查
```

### 5. 重启

```bash
ssh daphile '/etc/init.d/mediaserver restart && sleep 10 && /etc/init.d/mediaserver status'
ssh daphile 'ps aux | grep -c "[s]queezelite"'   # 应 ≥ 1
```

---

## 二、日常更新

### 只改词表

```bash
# 1. 编辑 glossary/*.json
# 2. 应用
python3 scripts/patch-strings.py strings-remote.txt glossary/lms-core.json
python3 scripts/merge-dict.py web/zh-cn.js glossary/dom-zh.json dom
scp strings-remote.txt web/zh-cn.js daphile:/...   # 传回
ssh daphile '/etc/init.d/mediaserver restart'
```

### 装了新插件

```bash
# 1. 把该插件的译文加进 glossary/plugins.json
# 2. 同步 + 重启（之后每次开机都会自动同步）
ssh daphile 'zh-plugin-sync && /etc/init.d/mediaserver restart'
```

### 升级了 LMS / Daphile 固件

```bash
# 上游可能覆盖 /opt/mediaserver/HTML 与 strings.txt
ssh daphile 'zh-plugin-sync'     # 插件部分自动补回
# 主 strings.txt 需重新走「首次部署」第 1 步
```

---

## 三、验证

### 命令行

```bash
# 条目数
ssh daphile 'grep -c ZH_CN /opt/mediaserver/strings.txt'

# 某个 key 是否已译
ssh daphile 'grep -A3 "^SETUP_PASSWORD_REPEAT$" /opt/mediaserver/strings.txt'

# zh-cn.js 两个位置都在
ssh daphile 'ls -la /var/www/localhost/htdocs/js/zh-cn.js \
                      /opt/mediaserver/HTML/Daphile/js/zh-cn.js'

# 两端口可达性（应都是 200）
ssh daphile 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/js/zh-cn.js
            curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9000/Daphile/js/zh-cn.js'

# 同步器日志
ssh daphile 'tail -20 /var/log/zh-plugin-sync.log'
```

### 浏览器

| 页面 | 预期 |
|---|---|
| `http://<host>/` | 侧边栏中文 |
| `http://<host>:9000/` | LMS 原生界面中文 |
| 设置 → 播放机 / 我的音乐 / 高级 | 下拉框、说明全中文 |
| 设置 → 管理插件 → 点齿轮进插件设置 | 中文（走 9000 端口） |
| 深色主题下 | 文字清晰（实测背景色决定字色） |

控制台验证：

```javascript
__zhTheme      // 'bg' = 实测背景得出；'theme' = 跟随主题
__zhThemeLum   // 背景亮度，如 '0.11'
```

---

## 四、回滚

```bash
# strings.txt
ssh daphile 'ls -t /var/daphile/zh-backups/strings.txt.bak.* | head -1'

# zh-cn.js / 插件 strings.txt 的备份也在同一目录
ssh daphile 'ls /var/daphile/zh-backups/ | tail -20'

# 回滚后重启
scp <备份> daphile:/opt/mediaserver/strings.txt
ssh daphile '/etc/init.d/mediaserver restart'
```

---

## 五、卸载

```bash
# 1. 还原 strings.txt
scp daphile:/var/daphile/zh-backups/<最早备份> daphile:/opt/mediaserver/strings.txt

# 2. 删除注入
ssh daphile 'rm -f /var/www/localhost/htdocs/js/zh-cn.js \
                   /opt/mediaserver/HTML/Daphile/js/zh-cn.js \
                   /opt/mediaserver/HTML/Daphile/js/zh-theme-style.css'

# 3. 移除 init 脚本里的 zh-plugin-sync 调用（手动编辑）

# 4. 删除同步器与词库
ssh daphile 'rm -f /usr/local/bin/zh-plugin-sync /var/daphile/zh-plugin-zh.json'

# 5. 还原 header.html（去掉 <script src='/Daphile/js/zh-cn.js'> 那行）

ssh daphile '/etc/init.d/mediaserver restart'
```