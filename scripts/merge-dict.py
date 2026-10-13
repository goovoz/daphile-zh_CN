#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 JSON 词表合并进 zh-cn.js 的 DICT
===================================
与 merge-lms-glossary.py 不同：本脚本是**追加进主 DICT**（面向 Daphile Web UI），
而不是新建独立段。

用法：
    python3 merge-dict.py <zh-cn.js> <dict.json> [segment_name]
"""
import json
import re
import sys
import time


def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    js_path, json_path = sys.argv[1], sys.argv[2]
    seg = sys.argv[3] if len(sys.argv) > 3 else 'batch2'

    with open(js_path, encoding='utf-8', newline='') as f:
        js = f.read()
    with open(json_path, encoding='utf-8') as f:
        tr = json.load(f)

    # 排除 _comment 之类的元字段
    tr = {k: v for k, v in tr.items() if not k.startswith('_')}

    # 现有 key（避免重复定义覆盖）
    m = re.search(r'var DICT = \{(.*?)\n  \};', js, re.S)
    if not m:
        print('!! 未找到 DICT')
        return 1
    existing = set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)'\s*:", m.group(1), re.M))

    # 备份
    bak = '%s.bak.%s' % (js_path, time.strftime('%Y%m%d-%H%M%S'))
    with open(bak, 'w', encoding='utf-8', newline='') as f:
        f.write(js)

    added, dup = 0, 0
    lines = ["", "\t/* ---------- 补充词表：%s ---------- */" % seg]
    for k, v in sorted(tr.items()):
        if k in existing:
            dup += 1
            continue
        lines.append("\t'%s': '%s'," % (esc(k), esc(v)))
        added += 1

    # 插到 DICT 的结束 "  };" 之前
    #
    # ★ 关键：DICT 的最后一项可能没有结尾逗号（JS 允许），
    #   直接在其后追加新条目会产生 `'缓冲时间' '新key': ...` 的连续字符串 → 语法错误。
    #   实测踩过：node --check 报 "Unexpected string"。
    #   解决：先给最后一项补逗号。
    body = m.group(1)
    body_rstripped = body.rstrip()
    if body_rstripped and not body_rstripped.endswith(','):
        # 在最后一个非空字符后插入逗号
        cut = len(body) - len(body) + len(body_rstripped)   # rstrip 后长度
        body = body_rstripped + ',' + body[len(body_rstripped):]
        js = js[:m.start(1)] + body + js[m.end(1):]
        # 重新定位插入点（长度变了）
        m = re.search(r'var DICT = \{(.*?)\n  \};', js, re.S)
        idx = m.end(1)
    else:
        idx = m.end(1)

    js = js[:idx] + '\n'.join(lines) + js[idx:]

    with open(js_path, 'w', encoding='utf-8', newline='') as f:
        f.write(js)

    print('已合并 %d 条（跳过已存在 %d 条）' % (added, dup))
    print('备份：%s' % bak)
    return 0


if __name__ == '__main__':
    sys.exit(main())
