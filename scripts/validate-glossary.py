#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate-glossary.py —— 词表规范校验
====================================
CI 调用。检查本项目特有的、容易踩的规范：

1. key 命名规范（LMS 用大写下划线）
2. 占位符完整性（%s / %d / %1$s 等必须在译文中保留）
3. HTML 标签完整性（<a href> <br> <b> 等不能丢）
4. `_generic` 段的黑名单词（尾段匹配会误伤，见 docs/contributing.md）
5. 译文非空、类型正确
6. 中文译文里不应残留纯英文（专名白名单除外）

退出码非 0 = 校验失败（阻断 CI）。
"""
import glob
import json
import os
import re
import sys

# ── _generic 禁用词 ────────────────────────────────────────
# 这些词按 key 尾段匹配会误伤（PLUGIN_X_MODULE_NAME → "名称"）
GENERIC_BANNED = {
    'NAME', 'PORT', 'LEVEL', 'MODE', 'SERVER', 'INTERFACE',
    'TYPE', 'SIZE', 'TIME', 'DATE', 'BITS', 'DELAY', 'FILE',
    'PATH', 'URL', 'HOST', 'USER', 'GROUP', 'STATE', 'COUNT',
}

# ── 允许纯英文的专名（值完全等于其中之一才放行）────────────
PROPER_NOUNS = {
    # 音频格式名与编码名 —— 本来就不该翻译
    'Musepack', 'Ogg FLAC', 'Ogg Vorbis', 'Opus', 'WMA Pro', 'WavPack',
    'WavPack DSD', 'Windows Media', 'Windows Media Pro',
    'Lyrion Music Server', 'SoftSqueeze', 'Logic Teal', 'Daphile',
    'Spine', 'MPD', 'Squeezebox', 'Squeezelite', 'Droid',
    'AAC', 'FLAC', 'MP3', 'PCM', 'WAV', 'AIFF', 'ALAC', 'OGG',
    'OPUS', 'APE', 'WMA', 'M4A', 'SPX', 'DSF', 'DFF', 'aac',
    'flac', 'mp3', 'pcm', 'wav', 'aiff', 'alac', 'ogg', 'opus',
    'Spotify', 'TuneIn Radio', 'RadioTunes.com', 'AudioDio',
    'iHeartRadio', 'Last.fm', 'ClassicalRadio.com', 'xPL',
    'OFF', 'ON', 'HTTPS', 'HTTP', 'TLS', 'UPnP', 'DLNA', 'LMS',
    'CDN', 'HTTP(S)', 'PIN', 'MAC', 'ID', 'URL', 'RSS', 'OPML',
}

# ── 不该翻译的 key（结构性的，译文应保持标识）─────────────
STRUCTURAL = re.compile(
    r'^(TITLE|ARTIST|ALBUM|YEAR|TRACKNUM|DISC|TRACK|COMMENT|'
    r'DURATION|ALBUMARTIST|COMPOSER|BAND|VARIARTIST|MUSICBRAINZ.*)$',
    re.I)

PLACEHOLDER = re.compile(r'%(?:\{[^}]*\}|[0-9]+\$)?[sd]|%\d+\$[sd]')
TAG = re.compile(r'</?(?:a|br|b|i|em|strong|code|p|span|div|ul|ol|li|'
                 r'h[1-6])\b[^>]*>|&nbsp;|&amp;|&lt;|&gt;|&quot;',
                 re.I)
KEY_RE = re.compile(r'^[A-Z][A-Z0-9_]*$')
CJK = re.compile(r'[一-鿿]')

errors, warnings = [], []


def err(where, key, msg):
    errors.append('[%s] %s: %s' % (where, key, msg))


def warn(where, key, msg):
    warnings.append('[%s] %s: %s' % (where, key, msg))


def check_placeholders(where, key, en, zh):
    """译文必须保留英文里的全部占位符"""
    ep = sorted(PLACEHOLDER.findall(en))
    zp = sorted(PLACEHOLDER.findall(zh))
    if ep != zp:
        err(where, key,
            '占位符不匹配 —— 英文 %s，译文 %s（丢占位符会导致字段消失）'
            % (ep or '无', zp or '无'))


def check_tags(where, key, en, zh):
    """译文应保留英文里的 HTML 标签（尤其是 <a href>）"""
    et = re.findall(r'<(a|br|b|i|em|strong|code)\b', en, re.I)
    zt = re.findall(r'<(a|br|b|i|em|strong|code)\b', zh, re.I)
    if sorted(t.lower() for t in et) != sorted(t.lower() for t in zt):
        err(where, key,
            'HTML 标签不匹配 —— 英文有 %s，译文有 %s（丢标签会让链接/换行消失）'
            % (sorted(set(t.lower() for t in et)) or '无',
               sorted(set(t.lower() for t in zt)) or '无'))
    # 外链必须完整保留 href
    for m in re.finditer(r'href="(https?://[^"]+)"', en):
        if m.group(1) not in zh:
            err(where, key, '外链 href 丢失: %s' % m.group(1)[:60])


def check_zh_quality(where, key, en, zh):
    """译文质量：非空、非纯英文、不过长"""
    if not zh.strip():
        err(where, key, '译文为空')
        return
    if STRUCTURAL.match(en.strip()):
        # 结构标识符：译文应与英文一致（保留）
        if zh.strip() != en.strip():
            warn(where, key, '结构标识符的译文与原文不同，确认是否有意：%r' % zh[:30])
        return
    if zh.strip() in PROPER_NOUNS:
        return
    # 短的全大写缩写（MPC / OGG / WMA ...）是技术标识，不是漏翻
    if len(zh.strip()) <= 5 and zh.strip().isupper():
        return
    if not CJK.search(zh) and len(zh) > 2:
        # 可能是未翻译的英文
        if re.match(r'^[A-Za-z][A-Za-z \'\-.,()/:]+$', zh.strip()):
            err(where, key, '疑似未翻译（纯英文）: %r' % zh.strip()[:50])
    # 长度异常（中文通常比英文短，超过 2.5 倍多半是漏删占位内容）
    if len(en) > 12 and len(zh) > len(en) * 2.5:
        warn(where, key, '译文长度是英文的 %.1f 倍，请确认: %r'
             % (len(zh) / len(en), zh[:40]))


def validate_file(path):
    where = os.path.basename(path)
    try:
        data = json.load(open(path, encoding='utf-8'))
    except Exception as e:
        err(where, '-', 'JSON 解析失败: %s' % e)
        return

    if not isinstance(data, dict):
        err(where, '-', '顶层必须是对象 {key: 译文}')
        return

    # ★ DOM 层与硬编码层：key 本身就是英文原文（不是 LMS 的 KEY 形式），
    #   所以不适用「key 命名规范」与「疑似未翻译」两条规则。
    is_dom_layer = where.startswith('dom-') or where.startswith('hardcode-')

    # _generic 段：黑名单检查
    generic = data.get('_generic') or {}
    if not isinstance(generic, dict):
        err(where, '_generic', '必须是对象')
    else:
        for w in GENERIC_BANNED:
            if w in generic:
                err(where, '_generic.' + w,
                    '禁用词：尾段匹配会把 *_MODULE_NAME / *_FILENAME 等误伤'
                    '（详见 docs/contributing.md）。请显式写完整 key。')

    # 词条检查
    for key, zh in data.items():
        if key.startswith('_'):
            if key == '_generic':
                for gk, gv in (generic or {}).items():
                    if not isinstance(gv, str) or not gv.strip():
                        err(where, '_generic.' + str(gk), '译文为空或类型错误')
            continue

        # key 命名（仅对 strings-key 层生效）
        if not is_dom_layer and not KEY_RE.match(key):
            err(where, key, 'key 命名不规范（应全大写+下划线，如 SETUP_FOO_BAR）')

        # 类型
        if not isinstance(zh, str):
            err(where, key, '译文必须是字符串，实际是 %s' % type(zh).__name__)
            continue

        # 去空白后仍非空
        if not zh.strip():
            err(where, key, '译文为空')
            continue

        if not is_dom_layer:
            check_zh_quality(where, key, key, zh)

    # 主词表（有 EN 可对照的才做占位符/标签检查）
    # plugins.json 只有译文，没有英文原文，跳过


def validate_pairs(where, zh_path, en_path=None):
    """有英文原文时，做占位符/标签的成对校验"""
    if not en_path or not os.path.isfile(en_path):
        return
    try:
        zh = json.load(open(zh_path, encoding='utf-8'))
        en = json.load(open(en_path, encoding='utf-8'))
    except Exception:
        return
    # en 是 {key: {lang: text}} 形式
    n = 0
    for key, v in (zh or {}).items():
        if key.startswith('_') or not isinstance(v, str):
            continue
        src = (en or {}).get(key)
        if not src:
            continue
        entext = src.get('EN') if isinstance(src, dict) else None
        if not entext:
            continue
        check_placeholders(where, key, entext, v)
        check_tags(where, key, entext, v)
        n += 1
    if n:
        print('  %s ← %s 成对校验 %d 条' % (os.path.basename(zh_path),
                                          os.path.basename(en_path), n))


def main():
    files = sorted(glob.glob('glossary/*.json'))
    if not files:
        print('  ✗ 没找到词表文件')
        return 1

    print('=== 词表规范校验 ===')
    for f in files:
        validate_file(f)
        print('  %s 已检查' % f)

    # 若存在上游 strings 快照，做成对校验（可选）
    if os.path.isfile('reference/strings-en.json'):
        validate_pairs('成对校验', 'glossary/lms-core.json',
                       'reference/strings-en.json')

    print()
    if warnings:
        print('=== 警告 %d 条（不阻断）===' % len(warnings))
        for w in warnings[:30]:
            print('  ⚠', w)
        if len(warnings) > 30:
            print('  ...还有 %d 条' % (len(warnings) - 30))
        print()

    if errors:
        print('=== 错误 %d 条（阻断）===' % len(errors))
        for e in errors:
            print('  ✗', e)
        print()
        print('修复指引见 docs/contributing.md')
        return 1

    print('=== 全部通过 ✓ ===')
    return 0


if __name__ == '__main__':
    sys.exit(main())