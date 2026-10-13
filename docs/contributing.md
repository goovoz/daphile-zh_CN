# 贡献指南

## 加词条的判断流程

看到一个英文，第一步是**判断它属于哪一层**：

```
这个文本是 [% "KEY" | string %] 渲染出来的吗？
├─ 是 → key 在 /opt/mediaserver/strings.txt 里？
│        ├─ 在 → 放 glossary/lms-core.json
│        └─ 不在（插件贡献的）→ 放 glossary/plugins.json
└─ 否 → 是 DOM 里的静态文本？
         ├─ 是 → 放 glossary/dom-zh.json
         └─ 不确定 → 扫描工具反查（见下）
```

### 用扫描工具反查

```bash
python3 scripts/scan.py <host> --out need.json
```

输出的 key 已标注来源插件，直接对照放词表。

**扫不出来**（说明它既不是主库 key 也不是插件 key）→ 放 `dom-zh.json`。

---

## 翻译规范

### 占位符与标签必须原样保留

```json
{
  "PLUGINS_CHANGED_NEED_RESTART": "更改将在下次重启应用程序后生效。<a href=\"%s\">点击此处立即重启服务器。</a>",
  "SETTINGS_WITH_DATE": "2026 年 %s 月 %s 日"
}
```

- `%s` / `%d` → 原样保留，否则字段会丢
- `<a href="...">` `<br>` `<b>` → 原样保留，否则链接/格式会消失

### 前导空格

某些 key 的原文有前导空格（如 `' Lyrion Music Server is being...'`）。
译文保留它，避免排版跳动：

```json
{ "RESTARTING_PLEASE_WAIT": " Lyrion Music Server 正在重启…" }
```

### 专名不翻译

| 类别 | 例子 | 处理 |
|---|---|---|
| 品牌/服务名 | Spotify、TuneIn、ClassicalRadio.com | 保留原文 |
| 服务器产品名 | Lyrion Music Server | 保留原文 |
| 格式标识符 | `TITLE`、`TRACKNUM.ARTIST - TITLE` | **必须保留**，翻译了就没法用 |
| 音频格式 | AAC / FLAC / MP3 / WAV / PCM | 保留 |
| 文件系统路径 | `/var/daphile/mediaserver` | 保留 |
| 设备名 | 你的播放器名 | 保留 |
| 能力标记 | `[L, F, R]` | 保留 |

### 语气

- 简洁、口语化，符合软件本地化惯例
- 按钮用动词（`保存`、`应用`、`删除`）
- 状态用形容词（`已启用`、`未运行`）

---

## ⚠️ `_generic` 通用词条的严格限制

`plugins.json` 的 `_generic` 段按 **key 尾段**匹配：

```python
suffix = key.rsplit('_', 1)[-1]
if suffix in generic:
    use(generic[suffix])
```

**尾段相同 ≠ 语义相同**：

```
PLUGIN_XXX_MODULE_NAME   尾段 NAME  →  模块名   ← 不是"名称"
PLUGIN_XXX_PLAYERNAME    尾段 NAME  →  字段名   ← 也不是"名称"
```

### 规则

**✅ 可以放进 `_generic`**：语义完全由该词决定、无歧义的开关类词

```
YES  NO  ENABLE  DISABLE  ENABLED  SAVE  CANCEL  APPLY  SUBMIT
RESTART  DELETE  REMOVE  VIEW  GENERATE  ERASE  CLEAN  SELECT
PASSWORD  PINCODE  PAIR  COMPRESS  ENCRYPT  AUTOSAVE  AUTORUN
```

**❌ 绝对不能放**：尾段常见但语义多变的词

```
NAME  PORT  LEVEL  MODE  SERVER  INTERFACE  TYPE  SIZE  TIME  DATE  BITS
```

这些一律**显式写完整 key**。

> 已发生的真实事故：`_generic.NAME = "名称"` 导致
> `PLUGIN_ONLINE_LIBRARY_MODULE_NAME` / `PLUGIN_REMOTE_LIBRARY_MODULE_NAME` /
> `PLUGIN_CLASSICALRADIO_NAME` 三个模块名被填成"名称"。
> 现在这些 key 都已显式给出正确译文，`NAME` 也已从 `_generic` 移除。

---

## 词表文件约定

| 文件 | 格式 | 排序 |
|---|---|---|
| `lms-core.json` | 纯 `{key: 译文}` | 按 key 分组，保持易读 |
| `plugins.json` | `{_meta, _generic, <key>: 译文}` | `_meta` / `_generic` 在最前 |
| `dom-zh.json` | 纯 `{key: 译文}`，可含 `_note` | — |

**修改词表时**：
- 不要覆盖已有的正确译文
- 新增词条追加到相关分组
- 修正错误译文时**直接改值**，并在 PR 描述里说明

---

## 提交前自检

**最省事的方式 —— 直接跑 CI 的同款检查**（前两项必须通过）：

```bash
python3 scripts/validate-glossary.py && python3 scripts/scan-secrets.py
```

它检查：
- 词表 JSON 合法性与结构
- **占位符 `%s` / `%d` 是否在译文里保留**（丢了会导致字段消失）
- **HTML 标签 `<a href>` / `<br>` / `<b>` 是否保留**（丢了会导致链接消失）
- 疑似未翻译的纯英文（专名白名单除外）
- **`_generic` 禁用词**（`NAME` / `PORT` / `LEVEL` / `MODE` / `SERVER` / `INTERFACE`）
- 凭据、真实内网 IP、代理凭据、私钥
- 不该提交的文件（`.bak` / `strings-*.txt` / `need-*.json`）

需要更细的检查时：

```bash
# 覆盖率统计（信息性）
python3 scripts/coverage-report.py

# JS 语法
node --check web/zh-cn.js

# 换行符（CRLF 会让 LMS 解析失败）
python3 -c "
import glob,os
bad=[f for f in glob.glob('**/*',recursive=True) if os.path.isfile(f)
     and '.git/' not in f and not f.startswith('assets')
     and f.endswith(('.py','.js','.json','.md','.yml'))
     and b'
' in open(f,'rb').read()]
print('CRLF 文件:', bad or '无')"

# 暂存区专项扫描（提交前确认没把垃圾带进去）
python3 scripts/scan-secrets.py --staged
```

### 清理规则

**不要提交**：
- `*.bak*` 备份文件
- 从设备取回的临时文件（`strings-remote.txt`、`need-translate.json`）
- 真实 IP、密码、代理凭据
- 本地调试脚本的输出日志

**必须提交**：
- 词表（`glossary/*.json`）
- 脚本（`scripts/`）
- `web/zh-cn.js`
- 文档更新

---

## PR 描述建议包含

1. **改了什么**：补了哪些词条 / 修了什么 bug
2. **属于哪一层**：主库 / 插件 / DOM
3. **验证方式**：在哪些页面验证过，附截图
4. **如果有 `_generic` 变更**：说明为什么这个词可以安全地尾段匹配