#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向 LMS 的 Daphile skin 公共 header 注入 zh-cn.js
===============================================
注入点：/opt/mediaserver/HTML/Daphile/settings/header.html 的 </head> 之前

为什么选这里：
  - 该文件含 </head>，且被所有设置子页（含 Manage Plugins）PROCESS
  - iframe 内的插件页是独立文档，不会继承父页 script → 必须注入到子页自身
  - LMS 的 i18n（strings.txt）覆盖不到插件仓库数据（cache.db），
    那部分由 zh-cn.js 的 DOM 翻译层兜底

用法：
    python3 inject-lms.py <header.html>
"""
import re
import shutil
import sys
import time

TAG = '<!-- daphile-zh-lms -->'
INJECT = (
    '%s\n'
    '<style>\n'
    '/* 修正 LMS 插件页白字白底：Daphile 深色主题把 .pluginDesc 等文字\n'
    ' * 设成白色，而该区域背景是白的，导致插件名与说明完全看不见\n'
    ' * （原文同样看不见，属 Daphile skin 既有缺陷，非汉化引入）。 */\n'
    '.pluginList .pluginDesc, .pluginList label, .pluginList .pluginFooter,\n'
    '.pluginItem, .pluginItem label, .pluginItem .pluginDesc {\n'
    '\tcolor: #1a1a1a !important;\n'
    '}\n'
    '</style>\n'
    '<script type=\'text/javascript\' src=\'/js/zh-cn.js?v=lms1\' defer></script>\n'
) % TAG


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    path = sys.argv[1]

    with open(path, encoding='utf-8', newline='') as f:
        text = f.read()

    if TAG in text:
        print('已存在注入标记，跳过（幂等）')
        return 0

    idx = text.rfind('</head>')
    if idx < 0:
        print('!! 未找到 </head>')
        return 1

    new = text[:idx] + INJECT + text[idx:]

    bak = '%s.bak.%s' % (path, time.strftime('%Y%m%d-%H%M%S'))
    shutil.copy2(path, bak)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(new)

    print('已注入 %s（备份 %s）' % (path, bak))
    print('原 %d 字节 → 新 %d 字节' % (len(text), len(new)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
