# 架构说明

本文记录 daphile-zh 的设计原理与**踩过的坑**。如果你要扩展词表或排查问题，先读这里。

---

## 一、三层翻译模型

界面文字有三个互不相同的来源，**判断错层会导致修复无效**。

```
┌─────────────────────────────────────────────────────────────┐
│  第 1 层：LMS strings key                                     │
│  来源：/opt/mediaserver/strings.txt                          │
│  特征：[% "KEY" | string %]                                   │
│  写入：patch-strings.py 补进主库                              │
│  例：SETUP_PASSWORD_REPEAT → 确认密码                          │
├─────────────────────────────────────────────────────────────┤
│  第 2 层：插件 strings key                                     │
│  来源：<plugin>/strings.txt（运行时被加载）                    │
│  写入：zh-plugin-sync 写进**插件自己的** strings.txt           │
│  例：PLUGIN_RAOPBRIDGE_AUTORUN → 启动桥接                       │
├─────────────────────────────────────────────────────────────┤
│  第 3 层：DOM 层                                               │
│  来源：Perl 硬编码 / 动态拼接 / 无 key 的菜单项                  │
│  写入：merge-dict.py 合入 zh-cn.js，在 DOM 上替换文本           │
│  例：Settings.pm 里写死的 '[common parameters]'                 │
│      <option>[通用参数]</option>                               │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ 第 2 层的遮蔽效应（重要）

**只往主 strings.txt 补插件 key 是无效的。**

插件的 `strings.txt` 在运行时会被加载，同名 key **遮蔽主库**，即使主库有目标语言译文，LMS 也**不会回退**：

```
主库  : PLUGIN_RAOPBRIDGE_USERGUIDELINK → EN: View User Guide / ZH_CN: 查看用户指南
插件库: PLUGIN_RAOPBRIDGE_USERGUIDELINK → EN: View User Guide / （无 ZH_CN）
页面  : View User Guide          ← 仍显示英文
```

**结论：译文必须直接写进插件自己的 strings.txt。** 这是 `zh-plugin-sync` 存在的根本原因。

---

## 二、zh-cn.js 注入点：必须部署两份

这是本项目最容易踩的坑之一。

Daphile 上有两个 HTTP 服务，webroot 互不共享：

| 服务 | 端口 | webroot | 谁在用 |
|---|---|---|---|
| lighttpd | 80 | `/var/www/localhost/htdocs` | Daphile Web UI、Daphile skin 的设置页 |
| LMS (mod_perl) | 9000 | `/opt/mediaserver/HTML` | **插件设置页** |

注入代码写在 `HTML/Daphile/settings/header.html`，插件设置页也 `PROCESS` 这个模板，但：

```html
<!-- 错误：只有 80 端口能取到，插件页（9000）404 -->
<script src='/js/zh-cn.js' defer></script>

<!-- 正确：两个端口都能取到 -->
<script src='/Daphile/js/zh-cn.js' defer></script>
```

实测：`/Daphile/js/zh-cn.js` 在 80 与 9000 均返回 200。

**因此文件必须同时放两份：**
- `/var/www/localhost/htdocs/js/zh-cn.js`
- `/opt/mediaserver/HTML/Daphile/js/zh-cn.js`

`zh-plugin-sync` 已内置这个同步逻辑（按 mtime 比对，只在源文件更新时复制）。

---

## 三、主题机制

Daphile 通过切换 `<link id="theme">` 的 href 换主题：

```
theme-default.css   ← 深色（0 字节空文件，即「不覆盖」，用 skin 默认白字 + 壁纸）
theme-light.css     ← 浅色（显式设 body 黑字 + 白底）
```

「设备」模式下 `DaphileCssTheme` 监听 `prefers-color-scheme` 自动换 link，无需刷新。

### 颜色判定：实测背景优先，主题兜底

```javascript
1) 从 .pluginList 逐级向上找第一个 alpha > 0.05 的背景色
2) 算亮度 (0.299R+0.587G+0.114B)/255，> 0.55 → 深字，否则浅字
3) 一路透明（无壁纸，背景由浏览器提供）→ 回落跟随主题
```

**为什么需要两层**：实测未设壁纸时，深色主题下 `html`/`body`/`.pluginList` 背景全是
`rgba(0,0,0,0)`，`#wallpaper` 元素根本不存在 —— 背景完全由浏览器决定。
只跟随主题会在「深色主题 + 浅色浏览器背景」下看不清。

调试变量：`window.__zhTheme`（`bg` / `theme`）、`window.__zhThemeLum`。

### ⚠️ 别把测试环境的假象当真 Bug

无头浏览器不加载壁纸，背景透明显示为白。如果此时判断"深色主题下文字看不见"，
就会做出错误判断。**排查视觉问题前先确认背景到底由谁提供。**

---

## 四、其他 zh-cn.js 职责

| 功能 | 说明 |
|---|---|
| 文本翻译 | MutationObserver + 兜底 sweep，覆盖动态生成的节点 |
| 主题颜色 | 见上文 |
| 菜单去重 | 隐藏 LMS 插件分类菜单里的同名重复项 |
| 硬编码兜底 | 翻译 `Settings.pm` 里写死的字符串 |

### ⚠️ 性能优化不能排在正确性之前

原先 `translateNode()` 有一行前置过滤：

```javascript
// ❌ 错误：首字符非字母直接 return，导致 [common parameters] 永远翻不到
if (!isASCIILetter(trimmed.charCodeAt(0))) return false;

// ✅ 正确：先查表，查不到才做快速过滤
var hit = LOOKUP[trimmed];
if (hit === undefined && !isASCIILetter(trimmed.charCodeAt(0))) return false;
```

**教训：任何"快速失败"的优化都不能跳过正确性判断。**

---

## 五、zh-plugin-sync 工作原理

```
扫描 InstalledPlugins/Plugins/*/strings.txt     （已装插件）
  + /opt/mediaserver/Slim/Plugin/*/strings.txt  （LMS 内置插件）
    → 缺 ZH_CN 的 key，从 plugins.json 取译文
      ├─ 完整 key 命中 → 直接用
      └─ 尾段命中 _generic → 兜底（★ 仅限无歧义词，见 README）
    → 写入该插件自己的 strings.txt（插入 key 块内，块尾空行之前）
    → 顺带把 zh-cn.js 同步到两个 webroot（mtime 比对）
    → 词库未覆盖的 key 写入 /var/log/zh-plugin-sync.log
```

**自动触发**：挂在 `/etc/init.d/mediaserver` 的 `start_pre()`（Daphile 用 OpenRC）：

```sh
# 必须在 LMS 启动前跑（strings.txt 是启动时读入内存的）
if [ -x /usr/local/bin/zh-plugin-sync ]; then
    timeout 30 /usr/local/bin/zh-plugin-sync >/dev/null 2>&1 || true
fi
```

`timeout` + `|| true` 保证**绝不阻塞服务启动**。

### 两条独立职责：补 与 修

```python
if need:      inject_zh(...)        # 补缺失
if not dry:   fix_bad_generic(...)  # 修误填 —— ★ 必须无条件执行
```

修正逻辑只改「译文恰好等于被移除的通用词」**且**「词库有正确译文」的行，
精准打击，不碰其他正确译文。

> 曾把 `fix_bad_generic` 塞在 `if not need: continue` 里，
> 结果「有补条目的插件」永远得不到修正。**补与修必须各自无条件执行。**

### 备份

每次写文件前自动备份到 `/var/daphile/zh-backups/`。

---

## 六、patch-strings.py 的语义

**只补缺失，不覆盖已有。**

```
patch-strings.py <strings.txt> <词表.json>
  → 对每个 key：若已有 ZH_CN → 跳过
              若缺失     → 追加 ZH_CN 行
```

**为什么要严格**：词表是增量的，主 `strings.txt` 里已经有 700+ 条 LMS 官方自带的中文译文。
若无脑覆盖，会把官方译文也冲掉。

### ⚠️ 但它无法修正"已有的错误译文"

实测发现 LMS 官方自带的中文有错：

```
DISABLED    EN='Disabled'  ZH_CN='撤销'   ← 官方译错（应为"已禁用"）
ALARM_OFF   EN='Off'       ZH_CN='撤销'   ← 同上
```

这类问题 `patch-strings.py` 不会碰（因为"已有译文"）。
需要单独脚本：定位 key 块 → 块内正则替换 `\tZH_CN\t.*`。

**发现界面异常时，先确认是不是自己造成的** —— 这次就发现了官方自带译文错误。

---

## 七、扫描工具的正确用法

### ✅ 用 HTTP 抓服务端渲染的 HTML

```python
html = urllib.request.urlopen(BASE + path).read()
texts = re.findall(r'>([^<>]{2,200})<', html)   # 含 <option> 内文本
```

### ❌ 不要用 Playwright 抓渲染后的 DOM

- 等久了 → `zh-cn.js` 已把能翻的翻掉，抓不到英文
- 等短了 → DOM 还没渲染全

实测：前者命中 24 条，后者命中 107 条。

### 页面路径陷阱

| 想要 | 正确路径 | 常见错误 |
|---|---|---|
| 闹钟 | `settings/player/alarm.html` | `alarms.html` |
| 同步 | `settings/player/synchronization.html` | `sync.html` |
| 高级 | `settings/server/formatting.html` | `advanced.html` |
| 附加浏览 | `plugins/ExtendedBrowseModes/settings/browsemodesplayer.html` | `settings/` |

**准确清单来源**：
- 设置页：`find /opt/mediaserver/HTML/EN/settings -name '*.html'`
- 插件页：`find ... -path '*/HTML/EN/plugins/*' -name '*.html'`

### ⚠️ HTTP 200 不代表页面存在

LMS 对不存在的页面返回 **200 + 6562 字节的错误页**。必须按内容大小或特征判断。

---

## 八、字符串还原规则

`strings.txt` 格式为 **tab 分隔**：

```
KEY
	EN	English text
	ZH_CN	中文译文
	
```

注意：
1. **必须是 LF，不是 CRLF**。上传前检查 `content.count('\r\n') == 0`。
2. 译文里的 `<a href="%s">` 等 HTML 标签与 `%s` 占位符**必须原样保留**。
   丢掉占位符会让链接整个消失；丢掉标签会让文本变成死文字。
3. 某些 key 的原文有**前导空格**（如 `' Lyrion Music Server is being...'`），
   译文保留以免排版跳动。

---

## 九、Daphile 的 overlay 文件系统

```
/boot/fw*/rootfs → /mnt/root-ro   (squashfs, 只读)
overlay on / (upperdir=/mnt/hdd/system/root-rw-fw*/upper)
```

- 对 `/opt/mediaserver` 的修改**持久保存**在 HDD 的 upperdir
- 但 Daphile 的**配置同步事件**（如启动时的配置应用）会 touch upperdir 内文件的 mtime
  并重启音频栈 —— mtime 变化 ≠ 内容改变，排查时先 diff 内容再下结论

---

## 十、排障速查

| 症状 | 先查 |
|---|---|
| 设置页全英文 | `strings.txt` 是否已写入 ZH_CN；是否重启过 LMS |
| 插件页全英文 | zh-cn.js 是否在 **9000 端口**可达；插件 strings.txt 是否被遮蔽 |
| 某页英文、某页中文 | 对比 key 是否在主库 vs 插件库 → 判断遮蔽 |
| 刷新后改动没生效 | LMS 是否重启（strings.txt 启动时读入内存） |
| 深色主题下文字看不见 | 实测背景色（`getComputedStyle`），别被无头浏览器假象误导 |
| 下拉框出现同名项 | 上游 bug，用 zh-cn.js 的 `zhDedupeMenu()` |
| **No audio devices** | `ps aux \| grep squeezelite`，无进程则 `mediaserver restart` |

详见 [troubleshooting.md](troubleshooting.md)。