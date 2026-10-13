# 更新日志

本文件记录 daphile-zh 的重要变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### 新增
- **CI 自动校验**（`.github/workflows/ci.yml`）
  push 与 PR 自动跑 9 项检查，其中 6 项阻断：
  词表 JSON 合法性与规范（含占位符 / HTML 标签保留、疑似未翻译、
  `_generic` 禁用词）、Python 与 JS 语法、换行符必须 LF、凭据泄漏扫描
- **Issue / PR 模板**（3 个 Issue + 1 个 PR）
  词条补充、Bug 报告、新插件汉化请求；PR 模板含「是否修改 `_generic`」必答项
- 三个 CI 校验脚本，也可在本地跑：
  `validate-glossary.py`（词表规范）、`scan-secrets.py`（凭据扫描，支持
  `--staged` 只扫暂存区）、`coverage-report.py`（覆盖率统计）

### 计划
- 补齐 LMS 设置页剩余缺译 key
- 扩展扫描器覆盖首页侧边栏（AJAX 动态加载，当前 HTTP 抓取覆盖不到）

---

## [0.3.0] — 2026-10-13

### 新增
- **插件汉化自动同步机制** `zh-plugin-sync`
  - 扫描已装插件 + LMS 内置插件的 `strings.txt`（共 48 个）
  - 自动把译文写进**插件自己的** strings.txt
  - 挂在 `mediaserver` 的 `start_pre()`，开机自动运行
  - 每次写入前自动备份到 `/var/daphile/zh-backups/`
- **通用词误填修正** `fix_bad_generic()`
  - 精准修正被 `_generic` 尾段匹配误填的译文
  - 补与修为两条独立职责，各自无条件执行
- 扫描工具 `scan.py` 统一入口
- 故障排查文档、架构文档、贡献指南

### 修复
- **插件设置页 zh-cn.js 加载不到**
  - 插件页走 LMS 的 9000 端口，与 lighttpd(80) 的 webroot 不共享
  - 注入路径 `/js/zh-cn.js` → `/Daphile/js/zh-cn.js`
  - 文件同时部署到两个 webroot
- **zh-cn.js 首字符过滤导致漏翻**
  - `<option>[common parameters]</option>` 因以 `[` 开头被前置过滤挡掉
  - 改为「先查表，查不到才做快速过滤」
- **插件分类菜单重复项**
  - LMS `prepareDetails()` 把 `top` 分类注入两次
  - `zhDedupeMenu()` 在 DOM 层隐藏重复项
- **LMS 官方自带译文错误**
  - `DISABLED` → "撤销"（应为"已禁用"）
  - `ALARM_OFF` → "撤销"（应为"关闭"）
- **`_generic` 尾段匹配误伤**
  - 移除 `NAME`/`PORT`/`LEVEL`/`MODE`/`SERVER`/`INTERFACE`
  - 显式补齐所有 `*_NAME` key 的正确译文

### 词表
- 主 strings.txt：978 → **1086** 条
- 插件 strings.txt：**240+** 条
- DOM 层：**90+** 条
- 覆盖 LMS 全部设置页 + 已装/内置插件设置页

---

## [0.2.0] — 2026-10-13

### 新增
- 插件汉化能力：词表区分主库 key / 插件 key / DOM 层
- 主题自适应：实测背景优先，主题兜底

### 修复
- 插件设置页未汉化（根因：插件 strings.txt 遮蔽主库，译文需直接写入插件库）

---

## [0.1.0] — 2026-10-12

### 新增
- LMS 界面汉化（strings.txt 补丁）
- `zh-cn.js` DOM 翻译层
- 中文 Web 字体（Noto Sans SC）
- 插件设置页 zh-cn.js 注入

### 已知问题
- 静态 CSS 强制黑字，导致深色主题下文字不可见（后由 0.3.0 的主题自适应修复）