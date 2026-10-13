#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LMS strings.txt ZH_CN 批量补丁
==============================
给 Lyrion Music Server 的 strings.txt 补充缺失的简体中文（ZH_CN）翻译。

为什么需要：
  LMS 有完整的 i18n 框架（strings.txt + language pref），Daphile 已设 language: ZH_CN，
  且 719 条 ZH_CN 已存在。但 Manage Plugins 等相关 key 只有 EN，没有 ZH_CN，
  LMS fallback 到英文 → 界面中英混杂。

  ★ 关键：修改 strings.txt 后必须重启 LMS 才会重新加载（LMS 启动时读入内存）。

文件格式（tab 分隔，语言按 ISO 639-1 两字母码字母序排列）：
    KEY_NAME
    \tCS\t翻译
    \tEN\tEnglish
    \tZH_CN\t简体中文      ← ZH_CN 字母序最靠后，插在 key 块末尾

用法：
    python3 patch-strings.py <strings.txt> <translations.json> [--dry-run]
    translations.json 格式：{"KEY": "中文", ...}
"""
import json
import shutil
import sys
import time


def patch(path, translations, dry=False):
    # ★ newline='' 必须加：Windows 上 Python 文本模式默认把 '\n' 写成 '\r\n'，
    #   会把 LMS 的 strings.txt 从 LF 变成 CRLF → LMS 解析全线失败、服务崩溃：
    #     Error: Parsing /opt/mediaserver/strings.txt line 26839: SETUP_ALBUMLINKROLES
    #   实测踩过：补丁后 LMS status: crashed，恢复原文件才好。
    with open(path, encoding='utf-8', newline='') as f:
        text = f.read()
    lines = text.split('\n')

    # 定位每个 key 块：[起始行, 结束行)
    blocks = {}
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        if ln and not ln.startswith('\t') and not ln.startswith('#'):
            key = ln.strip()
            j = i + 1
            while j < n and lines[j].startswith('\t'):
                j += 1
            blocks[key] = (i, j)
            i = j
        else:
            i += 1

    added, skipped, missing = [], [], []

    for key, zh in translations.items():
        if key not in blocks:
            missing.append(key)
            continue
        s, e = blocks[key]
        body = lines[s:e]
        # 已有 ZH_CN？
        if any(l.startswith('\tZH_CN\t') for l in body):
            skipped.append(key)
            continue
        # 找块内最后一个语言行（非空 tab 行）
        last = None
        for idx in range(e - 1, s, -1):
            if lines[idx].startswith('\t'):
                last = idx
                break
        if last is None:
            # key 块没有任何翻译行（异常），插在 key 行后
            last = s
        lines.insert(last + 1, '\tZH_CN\t%s' % zh)
        added.append(key)
        # 插入后后续 key 块的行号全部 +1，需要重算
        for k in blocks:
            bs, be = blocks[k]
            if bs > last:
                blocks[k] = (bs + 1, be + 1)
        blocks[key] = (s, e + 1)

    if dry:
        print('--- dry-run ---')
        print('将新增 %d 条，已存在 %d 条' % (len(added), len(skipped)))
        for k in added:
            print('  + %-40s %s' % (k, translations[k]))
        if missing:
            print('!! key 不存在于 strings.txt: %s' % ', '.join(missing))
        return

    bak = '%s.bak.%s' % (path, time.strftime('%Y%m%d-%H%M%S'))
    shutil.copy2(path, bak)
    # ★ 同样必须 newline=''，否则 Windows 上会把 LF 写成 CRLF
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write('\n'.join(lines))

    print('已写入 %s（备份 %s）' % (path, bak))
    print('新增 %d 条，已存在跳过 %d 条' % (len(added), len(skipped)))
    for k in added:
        print('  + %-40s %s' % (k, translations[k]))
    if skipped:
        print('  已存在: %s' % ', '.join(skipped))
    if missing:
        print('!! key 不存在: %s' % ', '.join(missing))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    if len(args) != 2:
        print(__doc__)
        return 2
    with open(args[1], encoding='utf-8') as f:
        tr = json.load(f)
    patch(args[0], tr, dry)
    return 0


if __name__ == '__main__':
    sys.exit(main())
