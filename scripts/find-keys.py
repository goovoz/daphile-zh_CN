#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从页面残留英文反查 LMS strings.txt 的 key
=========================================
思路：LMS 界面文字几乎都来自 strings.txt 的 key。页面上的英文（EN 行）
      可以反查回 key，然后给该 key 补 ZH_CN —— 这是最正统的做法，
      比 DOM 翻译更持久、更完整（连 tooltip、弹窗都能覆盖）。

用法：
    python3 find-keys.py <residue.json> <strings.txt> [page1,page2,...]
"""
import json
import re
import sys


def parse_strings(path):
    """返回 {key: {lang: text}} 和 {EN文本: [key, ...]}"""
    entries = {}
    cur = None
    with open(path, encoding='utf-8') as f:
        for ln in f.read().split('\n'):
            if ln and not ln.startswith('\t') and not ln.startswith('#'):
                cur = ln.strip()
                entries[cur] = {}
            elif ln.startswith('\t') and cur:
                p = ln.split('\t')
                if len(p) >= 3:
                    entries[cur][p[1]] = p[2]
    by_en = {}
    for k, v in entries.items():
        en = v.get('EN')
        if en:
            by_en.setdefault(en, []).append(k)
    return entries, by_en


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    residue = json.load(open(sys.argv[1], encoding='utf-8'))
    strings_path = sys.argv[2]
    pages = sys.argv[3].split(',') if len(sys.argv) > 3 else list(residue.keys())

    entries, by_en = parse_strings(strings_path)

    found, notfound = [], []
    for pg in pages:
        for t in residue.get(pg, []):
            # 去掉属性前缀
            raw = t.split(':', 1)[1] if t.startswith('@') else t
            raw = raw.strip()
            if raw in by_en:
                for k in by_en[raw]:
                    found.append((pg, k, raw, entries[k].get('ZH_CN')))
            else:
                notfound.append((pg, raw))

    # 去重
    seen = set()
    uniq = []
    for pg, k, en, zh in found:
        if k in seen:
            continue
        seen.add(k)
        uniq.append((pg, k, en, zh))

    print('=== 能反查到 key 的 %d 条 ===' % len(uniq))
    for pg, k, en, zh in sorted(uniq, key=lambda x: x[1]):
        flag = '有ZH' if zh else '缺ZH'
        print('  [%s] %-46s %-6s %s' % (pg, k, flag, en[:56]))
    print()
    print('=== 反查不到 key 的 %d 条（可能是动态值或模板硬编码）===' % len(notfound))
    for pg, t in notfound[:40]:
        print('  [%s] %s' % (pg, t[:80]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
