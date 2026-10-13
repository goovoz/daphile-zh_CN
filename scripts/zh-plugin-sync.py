#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
zh-plugin-sync —— 插件汉化自动同步器（v2）
===========================================
为什么必须直接改「插件自己的」strings.txt
----------------------------------------
实测：把 ZH_CN 补进主 /opt/mediaserver/strings.txt 后，
插件设置页仍输出英文。原因：
  - 插件自带的 strings.txt 定义了同一个 key（只有 EN）
  - LMS 加载插件 strings.txt 后，该 key 会被**插件的值遮蔽**
  - 即使主库有 ZH_CN，LMS 也**不会回退**（实测：
    主库 PLUGIN_RAOPBRIDGE_USERGUIDELINK = 查看用户指南，
    页面仍输出 View User Guide）
⇒ 所以译文必须写进插件自己的 strings.txt。

新插件自动汉化流程
------------------
  1. 装新插件
  2. 把该插件的译文加进 /var/daphile/zh-plugin-zh.json
  3. 重启 LMS（start_pre 会自动跑本脚本）
     → 扫描新插件 strings.txt → 找到词库里有的 key → 写入 ZH_CN → 重启 LMS 时生效
  4. 词库没覆盖的 key 会写进 /var/log/zh-plugin-sync.log，
     补完词库再跑一次即可

用法
----
    zh-plugin-sync              # 同步
    zh-plugin-sync --dry-run    # 只报告，不写
    zh-plugin-sync --report     # 只列缺译 key（含 EN 原文，便于补词库）
    zh-plugin-sync --sync-js    # 顺带把 zh-cn.js 同步到 LMS webroot
"""
import json
import os
import re
import shutil
import sys
import time
from collections import OrderedDict

PLUGINS = '/var/daphile/mediaserver/cache/InstalledPlugins/Plugins'
# 内置插件（LMS 自带，不在 InstalledPlugins 里）
BUILTIN = '/opt/mediaserver/Slim/Plugin'
STRINGS = '/opt/mediaserver/strings.txt'
GLOSSARY = '/var/daphile/zh-plugin-zh.json'
LOGFILE = '/var/log/zh-plugin-sync.log'
BACKUP_DIR = '/var/daphile/zh-backups'
JS_SRC = '/var/www/localhost/htdocs/js/zh-cn.js'
JS_DST = '/opt/mediaserver/HTML/Daphile/js/zh-cn.js'

LANGS = ('ZH_CN', 'DE', 'FR', 'ES', 'IT', 'NL', 'JA', 'CS', 'PL')


def log(msg):
    line = '[%s] %s' % (time.strftime('%Y-%m-%d %H:%M:%S'), msg)
    print(line)
    try:
        with open(LOGFILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass


def parse(path):
    """解析 strings.txt → OrderedDict[key, {lang: text}]"""
    e = OrderedDict()
    cur = None
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            for ln in f.read().split('\n'):
                if ln and not ln.startswith('\t') and not ln.startswith('#'):
                    cur = ln.strip()
                    e[cur] = {}
                elif ln.startswith('\t') and cur:
                    p = ln.split('\t')
                    if len(p) >= 3:
                        e[cur][p[1]] = p[2]
    except Exception:
        pass
    return e


def plugin_strings_files():
    """(插件名, strings.txt 路径) 列表 —— 已装插件 + LMS 内置插件"""
    out = []
    # 已装插件
    if os.path.isdir(PLUGINS):
        for pl in sorted(os.listdir(PLUGINS)):
            for dp, dn, fns in os.walk(os.path.join(PLUGINS, pl)):
                if 'strings.txt' in fns:
                    out.append((pl, os.path.join(dp, 'strings.txt')))
    # 内置插件（ExtendedBrowseModes / DontStopTheMusic / CLI / DnDPlay ...）
    if os.path.isdir(BUILTIN):
        for pl in sorted(os.listdir(BUILTIN)):
            root = os.path.join(BUILTIN, pl)
            if not os.path.isdir(root):
                continue
            for dp, dn, fns in os.walk(root):
                if 'strings.txt' in fns:
                    out.append(('[内置]' + pl, os.path.join(dp, 'strings.txt')))
    return out


def load_glossary():
    if not os.path.isfile(GLOSSARY):
        log('!! 词库不存在: %s' % GLOSSARY)
        return {}, {}
    try:
        with open(GLOSSARY, encoding='utf-8') as f:
            g = json.load(f)
    except Exception as e:
        log('!! 词库解析失败: %s' % e)
        return {}, {}
    generic = (g.pop('_generic', {}) or {})
    generic.pop('_note', None)
    g.pop('_meta', None)
    return {k: v for k, v in g.items() if not k.startswith('_')}, generic


def inject_zh(path, mapping):
    """往 strings.txt 的对应 key 块内插入 \\tZH_CN\\t译文。
    返回实际插入条数。文件行尾按原样保持。"""
    try:
        with open(path, encoding='utf-8', newline='') as f:
            raw = f.read()
    except Exception as e:
        log('  !! 读取失败 %s: %s' % (path, e))
        return 0

    eol = '\r\n' if '\r\n' in raw else '\n'
    lines = raw.split(eol)

    # 先算出每个 key 块的行范围
    blocks = []          # (start_idx, end_idx_exclusive, key)
    i = 0
    cur_key, cur_start = None, None
    while i < len(lines):
        ln = lines[i]
        if ln and not ln.startswith('\t') and not ln.startswith('#'):
            if cur_key is not None:
                blocks.append((cur_start, i, cur_key))
            cur_key, cur_start = ln.strip(), i
        elif cur_key is None and ln.strip() and not ln.startswith('\t'):
            pass
        i += 1
    if cur_key is not None:
        blocks.append((cur_start, len(lines), cur_key))

    # 从后往前插入，避免行号漂移
    inserts = []
    for start, end, key in blocks:
        if key not in mapping:
            continue
        block = lines[start:end]
        have = set()
        for bl in block:
            if bl.startswith('\t'):
                p = bl.split('\t')
                if len(p) >= 2:
                    have.add(p[1])
        if 'ZH_CN' in have:
            continue
        # 插到该块最后一行非空内容之后（即块尾的空行之前）
        pos = end
        while pos > start + 1 and not lines[pos - 1].strip():
            pos -= 1
        inserts.append((pos, '\tZH_CN\t%s' % mapping[key]))

    for pos, text in sorted(inserts, reverse=True):
        lines.insert(pos, text)

    if not inserts:
        return 0

    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
    except Exception:
        pass
    bak = os.path.join(BACKUP_DIR, '%s.bak.%s'
                       % (os.path.basename(path), time.strftime('%Y%m%d-%H%M%S')))
    shutil.copy2(path, bak)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(eol.join(lines))
    log('  备份 %s' % bak)
    return len(inserts)


# 曾被 _generic 尾段匹配误填的译文（key 尾段是 NAME/PORT/LEVEL/... 时命中通用词库）
BAD_VALUES = {'名称', '端口', '级别', '模式', '服务器', '接口',
              '大小', '类型', '时间', '日期', '比特'}


def fix_bad_generic(path, glossary):
    """把「ZH_CN 恰好等于被移除的通用词译文」的 key，改成词库里的正确译文。
    精准打击：不碰其他已正确翻译的 key。返回修复条数。"""
    try:
        with open(path, encoding='utf-8', newline='') as f:
            raw = f.read()
    except Exception:
        return 0

    eol = '\r\n' if '\r\n' in raw else '\n'
    lines = raw.split(eol)
    key = None
    fixes = []          # (行号, 新行)
    for i, ln in enumerate(lines):
        if ln and not ln.startswith('\t') and not ln.startswith('#'):
            key = ln.strip()
        elif ln.startswith('\t') and key:
            p2 = ln.split('\t')
            if len(p2) >= 3 and p2[1] == 'ZH_CN':
                cur = p2[2]
                # 只在译文「恰好等于被移除的通用词」时才改
                if cur in BAD_VALUES and key in glossary:
                    good = glossary[key]
                    if good != cur:
                        fixes.append((i, '\tZH_CN\t%s' % good))
    if not fixes:
        return 0

    for i, text in sorted(fixes, reverse=True):
        lines[i] = text
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
    except Exception:
        pass
    bak = os.path.join(BACKUP_DIR, '%s.fix%s'
                       % (os.path.basename(path), time.strftime('%H%M%S')))
    try:
        shutil.copy2(path, bak)
    except Exception:
        pass
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(eol.join(lines))
    return len(fixes)


def main():
    dry = '--dry-run' in sys.argv
    report = '--report' in sys.argv
    sync_js = '--sync-js' in sys.argv or True      # 默认总是同步

    # 1) 同步 zh-cn.js 到 LMS webroot（插件页走 9000 端口，
    #    那个端口的 webroot 是 /opt/mediaserver/HTML，不共享 lighttpd 的 /js/）
    if os.path.isfile(JS_SRC):
        try:
            os.makedirs(os.path.dirname(JS_DST), exist_ok=True)
            need = (not os.path.isfile(JS_DST)
                    or os.path.getmtime(JS_SRC) > os.path.getmtime(JS_DST))
            if need:
                shutil.copy2(JS_SRC, JS_DST)
                log('zh-cn.js 已同步到 LMS webroot: %s' % JS_DST)
        except Exception as e:
            log('  !! zh-cn.js 同步失败: %s' % e)

    gl, generic = load_glossary()
    files = plugin_strings_files()
    if not files:
        log('未找到插件 strings.txt')
        return 0
    log('扫描 %d 个插件 strings.txt，词库 %d 条' % (len(files), len(gl)))

    missing = OrderedDict()
    total_added = 0
    fixed = 0

    for pl, path in files:
        entries = parse(path)
        with_en = {k: v for k, v in entries.items() if v.get('EN')}
        if not with_en:
            continue
        need = OrderedDict()
        for k, v in with_en.items():
            if 'ZH_CN' in v:
                continue
            if k in gl:
                need[k] = gl[k]
                continue
            suffix = k.rsplit('_', 1)[-1]
            if suffix in generic:
                need[k] = generic[suffix]
            elif k in generic:
                need[k] = generic[k]
            else:
                missing[k] = v['EN']

        # 先补缺失
        if need:
            if dry:
                log('[dry] %-16s 待补 %d 条' % (pl, len(need)))
            else:
                n = inject_zh(path, need)
                total_added += n
                log('%-16s 写入 %d 条 ZH_CN' % (pl, n))
        # 再修正误填（★ 必须独立于上面那个分支：补了缺失也要修正误填）
        if not dry:
            nf = fix_bad_generic(path, gl)
            if nf:
                fixed += nf
                log('%-16s 修正误填 %d 条' % (pl, nf))

    if fixed:
        log('★ 共修正通用词误填 %d 条' % fixed)

    if report:
        print('\n=== 词库未覆盖（需补 zh-plugin-zh.json）===')
        for k, en in missing.items():
            print('  %-46s %s' % (k, en[:60]))
    else:
        log('本次共写入 %d 条' % total_added)
        if missing:
            log('词库未覆盖 %d 条（详见 %s）' % (len(missing), GLOSSARY))
    if not dry and total_added:
        log('★ 已改插件 strings.txt，需 /etc/init.d/mediaserver restart 生效')
    return 0


if __name__ == '__main__':
    sys.exit(main())