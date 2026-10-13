name: Pull Request
description: 提交词表或代码改动
body: |
  ## 这次改了什么

  <!-- 一两句话说清。例：补齐设置页「性能」子页的 23 条缺译 -->

  ---

  ## 改动类型

  - [ ] 补充词条（LMS 主库）
  - [ ] 补充词条（插件）
  - [ ] 补充词条（DOM 层）
  - [ ] 修正错误译文
  - [ ] 修复误伤（该保留原文却被翻译）
  - [ ] 修复脚本 / CI / 文档

  ---

  ## 改动内容

  <!-- 贴出 diff 的关键部分，或说明改了多少条 -->

  ```json
  {
    "示例": "示例译文"
  }
  ```

  ---

  ## 自查清单

  **必过项**（CI 会自动检查前四项）：

  - [ ] JSON 语法正确
  - [ ] 词表规范通过（`validate-glossary.py`）
  - [ ] 无凭据泄漏（`scan-secrets.py`）
  - [ ] 文件为 LF 换行（非 CRLF）

  **需人工确认**：

  - [ ] 占位符 `%s` / `%d` 已原样保留
  - [ ] HTML 标签 `<a href>` `<br>` `<b>` 已原样保留
  - [ ] 专名、音频格式名、格式标识符保持原文
  - [ ] 没有把有歧义的词加进 `_generic`

  ---

  ## 是否修改了 `_generic`

  - [ ] 否
  - [ ] 是 —— **请说明为什么这个词可以安全地按尾段匹配**：

  <!--
    参考：只有语义完全由该词决定、无歧义的开关类词才可以
    （YES / NO / ENABLE / SAVE / CANCEL …）
    NAME / PORT / LEVEL / MODE / SERVER / INTERFACE / TYPE / SIZE / TIME 是禁用词，
    它们会把 *_MODULE_NAME、*_FILENAME 之类翻错。
    详见 docs/contributing.md
  -->

  ---

  ## 验证方式

  <!-- 说明你如何确认改动生效 -->

  - [ ] 本地跑过 `scripts/validate-glossary.py` 与 `scripts/scan-secrets.py`
  - [ ] 在实际设备上验证过（重启 LMS 后）

  验证的页面：

  ```
  例：设置 → 高级 → 性能
  ```

  截图：

  ---

  ## 相关 Issue

  <!-- Closes #123 -->