#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan-secrets.py —— 凭据泄漏扫描
===========================
本仓库是 **public** 的，泄漏即事故。CI 每次 push / PR 都跑这个。

扫描目标：
  1. GitHub / 云厂商令牌
  2. 私钥
  3. 真实内网 IP（非 127.0.0.1 / 非 RFC1918 文档示例）
  4. 代理凭据
  5. 明文密码赋值
  6. 误提交的 strings.txt（含设备内部路径）
  7. 备份 / 临时文件被提交

退出码非 0 = 发现泄漏（阻断 CI）。
用法：
    python3 scripts/scan-secrets.py              # 扫整个仓库
    python3 scripts/scan-secrets.py --staged     # 只扫 git 暂存区
"""
import os
import re
import subprocess
import sys

# ── 高危模式（命中即失败）───────────────────────────────────
RULES = [
    ('GitHub 令牌', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{16,}')),
    ('fine-grained PAT', re.compile(r'\bgithub_pat_[A-Za-z0-9_]{20,}')),
    ('Slack token', re.compile(r'\bxox[abprs]-[A-Za-z0-9-]{10,}')),
    ('AWS Access Key', re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('Google API Key', re.compile(r'\bAIza[0-9A-Za-z_-]{35}\b')),
    ('私有密钥', re.compile(r'-----BEGIN\s+(?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----')),
    ('GitHub 新令牌', re.compile(r'\bgithub_pat_[A-Za-z0-9_]{20,}\b')),
    ('npm token', re.compile(r'\bnpm_[A-Za-z0-9]{36}\b')),
    ('PyPI token', re.compile(r'\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}\b')),
]

# 带凭据的代理 URL：scheme://user:pass@host
PROXY_CRED = re.compile(r'\b(?:https?|socks5?)://[^\s:/@]+:[^\s:/@]+@[^\s/]+')

# ── 明文密码赋值 ────────────────────────────────────────────
# 只匹配明显是凭据的上下文，避开词表里的 "Password": "密码"
PASSWORD_ASSIGN = re.compile(
    r'(?i)\b(?:passwd|password|secret|api[_-]?key|token|auth)\b\s*[:=]\s*'
    r'["\'][^"\']{6,}["\']')

PASSWORD_ALLOW = (
    '密码', '口令', '令牌', '占位', '示例', 'example', 'placeholder',
    'your-', 'YOUR_', 'xxx', 'XXX', '<', 'REDACT', 'hidden',
)

# ── 内网 IP（排除文档示例与保留地址）───────────────────────
INTERNAL_IP = re.compile(r'\b(?:10|172|192)\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})\b')
IP_ALLOW_CONTEXT = ('127.0.0.1', 'localhost', '0.0.0.0', '255.255.255.255',
                    '192.168.1.1',          # 文档里常见示例
                    '<IP>',                # 占位符
                    'example', 'EXAMPLE')

# ── 不该提交的文件 ──────────────────────────────────────────
FORBIDDEN_FILES = [
    (re.compile(r'\.env$'), '环境变量文件'),
    (re.compile(r'(^|/)github\.env$'), '令牌文件'),
    (re.compile(r'\.pem$|\.key$|\.p12$|\.pfx$|\.crt$'), '证书/私钥'),
    (re.compile(r'(^|/)id_(rsa|dsa|ecdsa|ed25519)$'), 'SSH 私钥'),
    (re.compile(r'\.bak(\.|$)'), '备份文件'),
    (re.compile(r'strings-remote\.txt$'), '设备 strings.txt 快照'),
    (re.compile(r'(^|/)strings-(new|final|v\d|now|ui|current|patched).*\.txt$'),
     '中间 strings 文件'),
    (re.compile(r'(^|/)need-.*\.json$'), '扫描输出'),
    (re.compile(r'(^|/)plugin-missing\.json$'), '扫描输出'),
    (re.compile(r'\.(pcap|cap|dmp)$'), '抓包文件'),
    (re.compile(r'(^|/)cap\d*\.log$|\.pcap\.log$'), '抓包日志'),
]

SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv',
             'dist', 'build', '.pytest_cache'}

TEXT_EXT = {'.py', '.js', '.json', '.md', '.txt', '.yml', '.yaml',
            '.sh', '.cfg', '.ini', '.conf', '.toml', '.html', '.css',
            ''}


def iter_files(root='.'):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            yield os.path.join(dp, fn)


def staged_files():
    try:
        out = subprocess.run(['git', 'diff', '--cached', '--name-only'],
                             capture_output=True, text=True, timeout=30)
        return [f for f in out.stdout.split('\n') if f.strip()]
    except Exception:
        return []


def scan_text(path, content):
    findings = []
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        # 跳过明显的注释/文档示例行
        stripped = line.strip()

        for name, pat in RULES:
            if pat.search(line):
                findings.append((path, i, name, '高危凭据'))

        for m in PROXY_CRED.finditer(line):
            # 文档里写的示例代理允许
            if any(a in line for a in ('example', 'EXAMPLE', '<', 'user:pass')):
                continue
            findings.append((path, i, '代理凭据 URL',
                             re.sub(r':[^:@]+@', ':***@', m.group(0))[:70]))

        for m in PASSWORD_ASSIGN.finditer(line):
            if any(a in line for a in PASSWORD_ALLOW):
                continue
            # 词表里 "PASSWORD": "密码" 这类已由 ALLOW 覆盖
            val = m.group(0)
            if any(cjk for cjk in ['一', '密', '码', '令', '盘'] if cjk in val):
                continue
            findings.append((path, i, '明文密码赋值', val[:60]))

        for m in INTERNAL_IP.finditer(line):
            if any(a in line for a in IP_ALLOW_CONTEXT):
                continue
            findings.append((path, i, '内网 IP', m.group(0)))
    return findings


def main():
    staged_only = '--staged' in sys.argv
    print('=== 凭据泄漏扫描 ===')
    if staged_only:
        print('  范围：git 暂存区')
        files = staged_files()
    else:
        print('  范围：整个仓库（已排除 .git/node_modules 等）')
        files = iter_files()

    findings = []
    bad_files = []
    scanned = 0

    for path in files:
        path = path.replace('\\', '/').lstrip('./')
        base = os.path.basename(path)

        # 1) 不该提交的文件类型
        for pat, desc in FORBIDDEN_FILES:
            if pat.search(path):
                bad_files.append((path, desc))

        # 2) 文本内容扫描
        ext = os.path.splitext(path)[1].lower()
        if ext not in TEXT_EXT:
            continue
        try:
            with open(path, encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception:
            continue
        scanned += 1
        findings.extend(scan_text(path, content))

    print('  已扫描 %d 个文本文件' % scanned)

    ok = True

    if bad_files:
        ok = False
        print()
        print('=== 不该提交的文件 %d 个（阻断）===' % len(bad_files))
        for p, d in bad_files:
            print('  ✗ %-46s %s' % (p, d))
        print()
        print('  修复：确认 .gitignore 已覆盖；若已误提交，git rm --cached <file>')

    if findings:
        # 内网 IP 在文档示例里可能正常，降级为警告
        hard = [f for f in findings if f[2] != '内网 IP']
        soft = [f for f in findings if f[2] == '内网 IP']

        if soft:
            print()
            print('=== 内网 IP %d 处（警告，请确认是否需替换为占位符）===' % len(soft))
            for p, i, kind, val in soft[:15]:
                print('  ⚠ %s:%d  %s' % (p, i, val))
            if len(soft) > 15:
                print('  ...还有 %d 处' % (len(soft) - 15))

        if hard:
            ok = False
            print()
            print('=== 严重泄漏 %d 处（阻断）===' % len(hard))
            for p, i, kind, val in hard:
                print('  ✗ %s:%d  [%s] %s' % (p, i, kind, val))
            print()
            print('  若为误报，请在本脚本的对应 RULES/ALLOW 列表里加白名单。')
            print('  若为真实泄漏：立刻吊销该凭据，并 git filter-repo 清理历史。')

    if ok:
        print()
        print('=== 未发现泄漏 ✓ ===')
    else:
        print()
        print('修复指引见 docs/contributing.md 的「提交前自检」')

    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())