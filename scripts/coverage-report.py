#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
coverage-report.py —— 词表覆盖率统计
====================================
信息性脚本（不阻断 CI），用于：
  1. README 里那张「当前状态」表格的自动更新
  2. 观察各层词表的增长趋势
  3. PR review 时快速看改动量
"""
import glob
import json
import os
import re
import sys

LAYERS = [
    ('lms-core.json',   'LMS 主库 key',    'strings.txt（第 1 层）'),
    ('plugins.json',    '插件 key',        '插件自己的 strings.txt（第 2 层）'),
    ('dom-zh.json',     'DOM 层',          'zh-cn.js DOM 翻译（第 3 层）'),
    ('hardcode-zh.json', '硬编码兜底',     'zh-cn.js DOM 翻译（第 3 层）'),
    ('ui-zh.json',      '设置界面（历史）', '已并入 lms-core.json'),
]


def count(path):
    try:
        d = json.load(open(path, encoding='utf-8'))
    except Exception as e:
        return None, str(e)
    if not isinstance(d, dict):
        return None, '顶层不是对象'
    n = len([k for k in d if not k.startswith('_')])
    generic = d.get('_generic') or {}
    ng = len([k for k in generic if not k.startswith('_')]) if isinstance(generic, dict) else 0
    return (n, ng), None


def zh_len_stats(path):
    """统计译文总字数（衡量工作量）"""
    try:
        d = json.load(open(path, encoding='utf-8'))
    except Exception:
        return 0
    total = 0
    for k, v in d.items():
        if k.startswith('_') or not isinstance(v, str):
            continue
        total += len(v)
    return total


def main():
    print('=== 词表覆盖率报告 ===')
    print()
    print('%-24s %-20s %8s %8s %10s'
          % ('文件', '层', '条目', '_generic', '译文字数'))
    print('-' * 74)

    total = 0
    total_chars = 0
    for fn, layer, target in LAYERS:
        p = os.path.join('glossary', fn)
        if not os.path.isfile(p):
            continue
        res, err = count(p)
        if res is None:
            print('%-24s %-20s %8s' % (fn, layer, 'ERR'))
            print('   %s' % err)
            continue
        n, ng = res
        chars = zh_len_stats(p)
        print('%-24s %-20s %8d %8d %10d'
              % (fn, layer, n, ng, chars))
        total += n
        total_chars += chars

    print('-' * 74)
    print('%-24s %-20s %8d %8s %10d'
          % ('合计', '', total, '', total_chars))
    print()

    # zh-cn.js 内嵌词条数
    js = 'web/zh-cn.js'
    if os.path.isfile(js):
        try:
            src = open(js, encoding='utf-8').read()
            # 数一下 DICT 里的条目：形如  'English': '中文',
            n = len(re.findall(r"'[A-Za-z][^']{1,90}':\s*'[^']*[\u4e00-\u9fff]", src))
            print('%-24s %-20s %8d %8s %10s'
                  % ('web/zh-cn.js', 'DOM 翻译层（含内嵌）', n, '-', '-'))
        except Exception:
            pass

    print()
    print('说明：')
    print('  · lms-core.json  → patch-strings.py 写入主 strings.txt')
    print('  · plugins.json   → zh-plugin-sync.py 写入各插件自己的 strings.txt')
    print('  · dom-*.json     → merge-dict.py 合入 zh-cn.js，在 DOM 层替换')
    print()
    print('新增词条流程见 docs/contributing.md')
    return 0


if __name__ == '__main__':
    sys.exit(main())