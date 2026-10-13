# 故障排查

按现象查表。每条都标注了**先查什么**和**为什么**。

---

## 音频相关

### 「No audio devices」/「Waiting for the audio devices」/「未能找到您的播放机」

```bash
ssh daphile 'ps aux | grep -c "[s]queezelite"'
```

**若为 0** → squeezelite 进程没起来：

```bash
ssh daphile '/etc/init.d/mediaserver restart'
```

**若 ≥ 1** → 播放器正常，问题在 LMS 侧，重启即可。

#### 根因与识别

Daphile 的配置同步事件（启动时应用配置等）会重启音频栈，
但 squeezelite **没有被重新拉起**。特征：

```
server.log   [08:00:08] playerSubscriptionChange request=client disconnect
squeezelite.log [08:00:08] slimproto_stop
```

**这是 Daphile 自身的时序问题，与汉化无关。**

> 特征识别：硬件层（`lsusb`、`/proc/asound/cards`）始终正常，
> 日志里能看到 `slimproto_stop` 后进程消失。

#### 排查纪律

> **mtime 变化 ≠ 内容被改。** 文件时间戳被 touch 很常见（overlay 同步），
> 下结论前先 diff 内容。本项目曾因此差点误判"改动被回滚"。

---

## 汉化相关

### 设置页全是英文

```bash
ssh daphile 'grep -c ZH_CN /opt/mediaserver/strings.txt'
```

| 检查 | 命令 | 正常值 |
|---|---|---|
| 补丁是否写入 | `grep -A3 "^某KEY$" .../strings.txt \| grep ZH_CN` | 有 |
| 是否重启过 | strings.txt 启动时读入内存 | — |
| 行尾是否被改成 CRLF | `ssh daphile 'grep -c $"\r" /opt/mediaserver/strings.txt'` | 0 |

### 插件设置页全是英文（但 LMS 设置页正常）

```bash
ssh daphile 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9000/Daphile/js/zh-cn.js'
```

返回 404 → **zh-cn.js 没放到 LMS webroot**。插件页走 9000 端口，与 80 不共享 webroot。

```bash
scp web/zh-cn.js daphile:/opt/mediaserver/HTML/Daphile/js/zh-cn.js
```

### 同一页面里有的中文有的英文

这是**正常的**，说明两层机制都在工作，只是部分 key 缺译文：

- 有 ZH_CN 的 key → 中文
- 缺 ZH_CN 的 key → 英文

用扫描工具找出缺的：

```bash
python3 scripts/scan.py <host> --out need.json
```

### 某个插件的译文不生效

**关键**：插件的 `strings.txt` 会**遮蔽**主库同名 key。

```bash
ssh daphile 'grep -A3 "^PLUGIN_XXX$" \
  /var/daphile/mediaserver/cache/InstalledPlugins/Plugins/<Name>/strings.txt'
```

即使主库有译文，只要插件库里没有，就会显示插件自己的 EN。

**必须往插件自己的 strings.txt 写** —— 跑 `zh-plugin-sync` 即可。

### 某个词显示成了另一个意思

可能命中了 `_generic` 的尾段误匹配。例如：

```
PLUGIN_XXX_MODULE_NAME  →  显示"名称"  ← 应该是模块名
```

检查：

```bash
ssh daphile 'grep -A4 "^PLUGIN_XXX_MODULE_NAME$" <plugin>/strings.txt | grep ZH_CN'
```

修法：在 `plugins.json` 里显式写完整 key 的正确译文，然后：

```bash
ssh daphile 'zh-plugin-sync'    # fix_bad_generic() 会自动纠正误填
```

---

## 显示与主题

### 深色主题下文字看不清

**先实测背景色**，别猜：

```javascript
getComputedStyle(document.querySelector('.pluginList')).backgroundColor
```

- 返回 `rgba(0, 0, 0, 0)` → 背景透明，由浏览器/壁纸提供
- 控制台看 `__zhTheme`： `'bg'` 表示已实测背景；`'theme'` 表示回落到主题判断

**未设壁纸时**，深色主题的背景完全由浏览器决定。浅色浏览器背景 + 深色主题时，
LMS 原生界面本身就有可读性问题 —— 不只是汉化部分。

### 无头浏览器验证出现"文字看不见"

**很可能是假象。** 无头浏览器不加载壁纸，背景透明显示为白。

排查视觉问题前先确认：**背景到底由谁提供**（壁纸元素 / body 背景 / 浏览器渲染）。

### 下拉框里出现同名项

LMS 上游 bug：`prepareDetails()` 收集分类时，`top` 分类被注入两次。

`zh-cn.js` 的 `zhDedupeMenu()` 会在 DOM 层隐藏重复项（保留第一个）。

### 译文里链接消失 / 标签丢失

占位符或 HTML 标签在翻译时丢了：

```json
"错误": "点击此处重启服务器",
"正确": "更改将在下次重启后生效。<a href=\"%s\">点击此处立即重启服务器。</a>"
```

---

## 部署与同步

### zh-plugin-sync 报告的 key 数量没变

```bash
ssh daphile 'tail -20 /var/log/zh-plugin-sync.log'
```

| 日志关键词 | 含义 |
|---|---|
| `待补 N 条，词库无覆盖 M 条` | 补了 N 条，M 条需要补词库 |
| `修正误填 N 条` | 修复了被 `_generic` 误伤的条目 |
| `无需更新 strings.txt` | 已同步过，幂等正常 |

如果 `M` 持续增长 → 需要往 `plugins.json` 补词条。

### 开机没有自动同步

```bash
ssh daphile 'grep -A5 "^start_pre()" /etc/init.d/mediaserver'
```

确认 `zh-plugin-sync` 调用在；再确认：

```bash
ssh daphile 'sh -n /etc/init.d/mediaserver'   # 语法
ssh daphile 'ls -la /usr/local/bin/zh-plugin-sync'  # 权限 +x
```

### LMS 起不来

**可能是我改坏了 init 脚本。** 回滚：

```bash
scp daphile:/etc/init.d/mediaserver.zh-backup daphile:/etc/init.d/mediaserver
ssh daphile 'chmod +x /etc/init.d/mediaserver && /etc/init.d/mediaserver restart'
```

> 改 init 脚本前务必备份。`zh-plugin-sync` 已用 `timeout 30 ... || true` 保护，
> 正常不会阻塞启动，但语法错误会。

---

## 快速诊断脚本

```bash
#!/bin/bash
# 一次性检查汉化部署的各处状态
D=daphile

echo "=== LMS 状态 ==="
ssh $D '/etc/init.d/mediaserver status 2>&1 | tail -1'

echo "=== squeezelite（音频播放器）==="
ssh $D 'ps aux | grep -c "[s]queezelite"'

echo "=== strings.txt 中文条目数 ==="
ssh $D 'grep -c ZH_CN /opt/mediaserver/strings.txt'

echo "=== 行尾检查（应为 0）==="
ssh $D 'grep -c $"\r" /opt/mediaserver/strings.txt'

echo "=== zh-cn.js 两处都在？ ==="
ssh $D 'ls -la /var/www/localhost/htdocs/js/zh-cn.js \
              /opt/mediaserver/HTML/Daphile/js/zh-cn.js 2>&1 | awk "{print \$5, \$9}"'

echo "=== zh-cn.js 可达性（应都是 200）==="
ssh $D 'curl -s -o /dev/null -w "80:  %{http_code}\n" http://127.0.0.1/js/zh-cn.js
        curl -s -o /dev/null -w "9000:%{http_code}\n" http://127.0.0.1:9000/Daphile/js/zh-cn.js'

echo "=== 同步器最近日志 ==="
ssh $D 'tail -5 /var/log/zh-plugin-sync.log 2>/dev/null'

echo "=== 开机自启是否挂上 ==="
ssh $D 'grep -c zh-plugin-sync /etc/init.d/mediaserver'
```

---

## 需要证据再下结论

几个反复踩过的坑：

1. **mtime 变化 ≠ 内容被改** —— 先 diff
2. **HTTP 200 ≠ 页面存在** —— LMS 的错误页也是 200 + 6562 字节
3. **无头浏览器的视觉 ≠ 真实渲染** —— 壁纸不加载
4. **同一现象可能有多层根因** —— 插件页不显示 JS，曾先后有「路径」「数据遮蔽」「代码 bug」三层

**逐层验证再动手**，否则第一层的"修复"可能白做。