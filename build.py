#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把样板课的可复用外壳（CSS / three.js / 交互 / 语音）与新课件内容拼成单文件。"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILL = Path(r"C:\Users\azlove2112\.workbuddy-ai\skills\biology-3d-courseware")
DEMO = SKILL / "demo" / "gene-expression" / "index.html"
OUT = ROOT / "S-03_光合作用.html"


def between(text, start, end):
    i = text.index(start)
    j = text.index(end, i + len(start))
    return text[i:j]


def main():
    demo = DEMO.read_text(encoding="utf-8")

    style = re.search(r"<style>([\s\S]*?)</style>", demo).group(1)
    scripts = re.findall(r"<script>([\s\S]*?)</script>", demo)
    three = max(scripts, key=len)
    if "THREE" not in three or len(three) < 400000:
        sys.exit("未找到内联 three.js")

    interact = between(
        demo,
        "/* ================= 视角交互：轨道 / 缩放 / 平移 / 点选 ================= */",
        "/* ================= 状态与渲染 ================= */",
    )
    voice = between(
        demo,
        "/* ================= 语音（五态） ================= */",
        "/* ================= UI ================= */",
    )

    # 交互块里与本课件无关的结构说明、注册、速查列表全部剔除
    interact = re.sub(r"const PICK_INFO = \{[\s\S]*?\n\};\n", "", interact)
    interact = re.sub(r"^regPick\([^\n]*\);\n", "", interact, flags=re.M)
    interact = re.sub(r"const STRUCT_LIST = \[[\s\S]*?\];\nSTRUCT_LIST\.forEach\([\s\S]*?\n\}\);\n", "", interact)
    # 半透明容器不只核膜：叶绿体外膜与基质壳同样要降级
    interact = interact.replace("if(id === 'nucleus')", "if(id === 'outer' || id === 'stroma')")

    for must in ("function regPick", "function pickAt", "function togglePanel", "function setCinema"):
        if must not in interact:
            sys.exit(f"交互块缺失: {must}")
    for must in ("function speakStage", "voiceState"):
        if must not in voice:
            sys.exit(f"语音块缺失: {must}")

    app = (ROOT / "_src" / "app.js").read_text(encoding="utf-8")
    app = app.replace("/*__INTERACT__*/", interact).replace("/*__VOICE__*/", voice)

    data = json.loads((ROOT / "_src" / "data.json").read_text(encoding="utf-8"))
    body = (ROOT / "_src" / "body.html").read_text(encoding="utf-8")
    extra = (ROOT / "_src" / "extra.css").read_text(encoding="utf-8")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>光合作用：光反应与暗反应联动 · 3D 互动课件</title>
<style>{style}
{extra}</style>
</head>
<body>
{body}
<script type="application/json" id="courseware-data">{json.dumps(data, ensure_ascii=False, indent=2)}</script>
<!-- three.js r128 已内联（three.min.js），无外链；下面仅作极端情况兜底 -->
<script>{three}</script>
<script>if(!window.THREE){{document.write('<script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\\/script>');}}</script>
<script>{app}</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"written {OUT}  {OUT.stat().st_size/1024:.0f} KB  stages={len(data['stages'])}")


if __name__ == "__main__":
    main()
