#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan.py —— 抓取界面残留英文，反查 strings.txt 的 key
=====================================================

用法
----
    python3 scan.py <host> --out need.json
    python3 scan.py 192.168.1.10 --page /Daphile/settings/player/audio.html
    python3 scan.py <host> --offline ./strings-remote.txt      # 只用本地 strings 索引

设计要点（踩过的坑）
--------------------
1. **用 HTTP 抓服务端渲染的 HTML，不要用浏览器抓渲染后的 DOM**
   等久了 zh-cn.js 已把能翻的翻掉，等短了 DOM 还没渲染全。
   前者命中 24 条，后者命中 107 条。

2. **HTTP 200 不代表页面存在**
   LMS 对不存在的页面返回 200 + 6562 字节错误页，必须按内容判断。

3. **页面路径不能猜**
   闹钟是 settings/player/alarm.html（不是 alarms），
   同步是 settings/player/synchronization.html（不是 sync）。

4. **排除不该翻的文本**
   格式标识符（TITLE / TRACKNUM.ARTIST - TITLE）、纯大写标识、音频格式名、
   文件路径、设备名、能力标记 [L, F, R]。
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import OrderedDict

# ---- 页面清单 ----------------------------------------------------------
# 设置页（来自 /opt/mediaserver/HTML/EN/settings/ 的实际结构）
SETTINGS = [
    'player/alarm', 'player/audio', 'player/basic', 'player/display',
    'player/menu', 'player/remote', 'player/synchronization',
    'server/basic', 'server/behavior', 'server/debugging',
    'server/filetypes', 'server/formatting', 'server/interface',
    'server/networking', 'server/performance', 'server/security',
    'server/software', 'server/status', 'server/wizard',
]

# 插件页（来自 find ... -path '*/HTML/EN/plugins/*'）
PLUGINS = [
    'ExtendedBrowseModes/settings/browsemodesplayer.html',
    'ExtendedBrowseModes/settings/browsemodes.html',
    'DontStopTheMusic/settings.html',
    'CLI/settings/basic.html',
    'DnDPlay/settings.html',
    'Favorites/settings/basic.html',
    'Favorites/index.html',
    'ViewTags/settings.html',
    'AudioScrobbler/settings/basic.html',
    'AudioScrobbler/settings/player.html',
    'RandomPlay/list.html',
    'MusicMagic/settings/musicmagic.html',
    'OnlineLibrary/settings.html',
    'RemoteLibrary/settings.html',
    'PreventStandby/settings/basic.html',
    'DateTime/settings/basic.html',
    'TuneIn/settings/basic.html',
    'Podcast/settings/basic.html',
    'InfoBrowser/settings/basic.html',
    'RaopBridge/settings/basic.html',
    'ShairTunes2W/settings/basic.html',
]

# ---- 过滤规则 ----------------------------------------------------------
SKIP_PAT = re.compile(
    r'^\s*\[.*\]\s*$'
    r'|^\s*(TITLE|ARTIST|ALBUM|YEAR|TRACKNUM|DISC|TRACK|COMMENT|DURATION|'
    r'ALBUMARTIST|COMPOSER|BAND|VARIARTIST)\s*$', re.I)

NOISE = re.compile(
    r'^\s*(AAC|FLAC|MP3|PCM|WAV|AIFF|ALAC|OGG|OPUS|APE|WMA.*|Musepack|'
    r'MPEG-?4.*|Ogg .*|NATIVE\+?|TRANSCODE|DECODE|Type:.*|'
    r'[Ss]queezelite\S*|[a-z0-9_]+-linux\S*|'
    r'daphile|Daphile.*|Lyrion Music Server|Lyrion\d*\d*|Squeezebox\S*)\s*$', re.I)

EN = re.compile(r'[A-Za-z]{3,}')


def parse_strings(path):
    """解析 strings.txt → OrderedDict[key, {lang: text}]"""
    e = OrderedDict()
    cur = None
    with open(path, encoding='utf-8', errors='replace') as f:
        for ln in f.read().split('\n'):
            if ln and not ln.startswith('\t') and not ln.startswith('#'):
                cur = ln.strip()
                e[cur] = {}
            elif ln.startswith('\t') and cur:
                p = ln.split('\t')
                if len(p) >= 3:
                    e[cur][p[1]] = p[2]
    return e


def fetch(base, path, timeout=12):
    try:
        req = urllib.request.Request(base + path)
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8', 'replace')
    except (urllib.error.URLError, OSError):
        return ''


def texts_of(html):
    """抽取可见文本：标签间内容 + 属性值"""
    out = []
    for m in re.finditer(r'>([^<>]{2,200})<', html):
        t = m.group(1).strip()
        if t:
            out.append(t)
    for m in re.finditer(r'(?:title|placeholder|alt)="([^"]{2,200})"', html):
        out.append(m.group(1).strip())
    return out


def is_error_page(html):
    """LMS 的 404 页也是 200，靠内容特征判断"""
    return (not html) or ('Not Found' in html) or len(html) < 800


def build_index(strings_paths):
    """EN 文本 -> key，只索引缺 ZH_CN 的"""
    by_en, by_trim = {}, {}
    for sp in strings_paths:
        if not os.path.isfile(sp):
            continue
        for k, v in parse_strings(sp).items():
            en = v.get('EN')
            if en and not v.get('ZH_CN'):
                by_en.setdefault(en, k)
                by_trim.setdefault(en.strip(), k)
    return by_en, by_trim


def main():
    ap = argparse.ArgumentParser(
        description='抓取界面残留英文并反查 strings key',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    ap.add_argument('host', nargs='?', help='设备地址，如 192.168.1.10')
    ap.add_argument('--port', default='', help='端口（80 或 9000），默认 80')
    ap.add_argument('--strings', action='append', default=[],
                    help='strings.txt 路径（可多次）。'
                         '不加则只扫 DOM 不反查 key')
    ap.add_argument('--page', action='append', default=[],
                    help='只扫指定页面（可多次）')
    ap.add_argument('--out', help='输出 JSON 路径')
    ap.add_argument('--list', action='store_true', help='只打印找到的文本，不反查')
    args = ap.parse_args()

    pages = ['/Daphile/settings/%s.html' % s for s in SETTINGS]
    pages += ['/Daphile/plugins/%s' % p for p in PLUGINS]
    if args.page:
        pages = list(args.page)

    if args.strings:
        by_en, by_trim = build_index(args.strings)
        print('strings 索引: %d 条缺译条目' % len(by_en))
    else:
        by_en, by_trim = {}, {}
        print('提示：未指定 --strings，只列出文本不反查 key')

    found = OrderedDict()
    untranslated = []

    if args.host:
        base = 'http://%s%s' % (args.host, args.port)
    else:
        base = None

    for path in pages:
        if not base:
            break
        html = fetch(base, path)
        if is_error_page(html):
            print('  %-58s 抓取失败' % path)
            continue
        hit = 0
        for t in texts_of(html):
            if not EN.search(t) or SKIP_PAT.match(t) or NOISE.match(t):
                continue
            k = by_en.get(t) or by_trim.get(t.strip())
            if k:
                found.setdefault(k, t)
                hit += 1
            else:
                untranslated.append(t)
        print('  %-58s 命中 %d' % (path, hit))

    print()
    print('=' * 70)
    print('可反查的缺译 key: %d 条' % len(found))
    for k, en in found.items():
        print('  %-46s %s' % (k, (en or '')[:56]))

    if untranslated:
        seen = sorted(set(untranslated))
        print()
        print('未命中词表的文本: %d 条（可能是硬编码，考虑放 dom-zh.json）' % len(seen))
        for t in seen[:30]:
            print('  %s' % t[:80])

    if args.out:
        result = {'matched': found, 'unmatched': sorted(set(untranslated))}
        json.dump(result, open(args.out, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        print()
        print('已写入 %s' % args.out)


if __name__ == '__main__':
    main()