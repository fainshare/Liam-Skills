#!/usr/bin/env python3
"""
hegel: 前置依赖检查

在运行 hegel 工作流前，检查所有依赖的 skill 是否已安装。
缺失的 skill 会输出安装指引，并阻止工作流继续。

用法:
    python3 scripts/preflight-check.py [--skills-dir ~/.qoder/skills] [--lite]

退出码:
    0 = 所有依赖已就绪
    1 = 有缺失的依赖 skill
"""

import argparse
import json
import os
import sys

# ──────────────────────────────────────────────────────
# 依赖清单：skill 目录名 → 说明 & 安装命令
# ──────────────────────────────────────────────────────

REQUIRED_SKILLS = {
    "code-review-skill": {
        "display_name": "code-review (代码审查)",
        "used_in": "Pass 1 — Code Review",
        "install_hint": "/find-skills code-review",
        "required_for": ["standard"],
    },
    "bayes": {
        "display_name": "bayes (贝叶斯深挖)",
        "used_in": "Pass 2 — Bayes 深挖 / Pass 4 — 架构深化再迭代",
        "install_hint": "/find-skills bayes",
        "required_for": ["standard", "lite"],
    },
    "feynman": {
        "display_name": "feynman (反自欺审查)",
        "used_in": "Pass 3 & Pass 5 — Feynman 反自欺审查",
        "install_hint": "/find-skills feynman",
        "required_for": ["standard", "lite"],
    },
    "deepen": {
        "display_name": "deepen (深化分析)",
        "used_in": "S5 — 深化验证（可选，缺失时降级为 bayes-only）",
        "install_hint": "/find-skills deepen",
        "required_for": [],
    },
}

RECOMMENDED_BY_LENS = {
    "investment": [
        {"dir": "deep-research", "display_name": "deep-research (联网深度研究)", "used_in": "S5 epistemic 数据收集"},
    ],
}


def check_recommended(skills_dir, lens):
    """检查当前 lens 推荐但未安装的 skill，返回缺失列表"""
    recs = RECOMMENDED_BY_LENS.get(lens, [])
    missing = []
    for r in recs:
        skill_path = os.path.join(skills_dir, r["dir"])
        if not os.path.isdir(skill_path):
            missing.append(r)
    return missing


def check_skills(skills_dir, mode="standard"):
    """检查所有依赖 skill 的安装情况，返回 (installed, missing) 两个列表"""
    installed = []
    missing = []

    for skill_dir, meta in REQUIRED_SKILLS.items():
        # lite 模式跳过仅 standard 需要的 skill
        if mode not in meta["required_for"]:
            continue

        skill_path = os.path.join(skills_dir, skill_dir)
        skill_md = os.path.join(skill_path, "SKILL.md")

        if os.path.isdir(skill_path) and os.path.isfile(skill_md):
            installed.append((skill_dir, meta))
        else:
            missing.append((skill_dir, meta))

    return installed, missing


def print_report(installed, missing, skills_dir, mode):
    """输出检查报告"""
    print("=" * 60)
    print("🔍  Hegel 前置依赖检查")
    print(f"   Skills 目录: {skills_dir}")
    print(f"   运行模式:    {'Lite（轻量）' if mode == 'lite' else 'Standard（标准）'}")
    print("=" * 60)

    if installed:
        print()
        print("✅ 已安装的依赖 skill：")
        for skill_dir, meta in installed:
            print(f"   ✅ {meta['display_name']}")
            print(f"      用于: {meta['used_in']}")

    if missing:
        print()
        print("❌ 缺失的依赖 skill：")
        print()
        for skill_dir, meta in missing:
            print(f"   ❌ {meta['display_name']}")
            print(f"      用于: {meta['used_in']}")
            print(f"      安装: {meta['install_hint']}")
            print()

        print("-" * 60)
        print("⚠️  请先安装以上缺失的 skill，再运行 hegel。")
        print()
        print("   快速安装所有缺失 skill：")
        for skill_dir, meta in missing:
            print(f"     {meta['install_hint']}")
        print()
        print("   安装完成后，重新运行 hegel 即可。")
        print("=" * 60)
        return False
    else:
        print()
        print("✅ 所有依赖 skill 已就绪，可以开始 hegel 工作流。")
        print("=" * 60)
        return True


def main():
    parser = argparse.ArgumentParser(
        description="检查 hegel 依赖 skill 的安装情况"
    )
    parser.add_argument(
        "--skills-dir",
        default=os.path.expanduser("~/.qoder/skills"),
        help="skills 安装目录（默认 ~/.qoder/skills）",
    )
    parser.add_argument(
        "--lite",
        action="store_true",
        help="Lite 模式：跳过仅标准模式需要的 skill（如 code-review）",
    )
    parser.add_argument(
        "--lens",
        default="code",
        help="当前 lens（用于报告显示，不影响依赖检查逻辑）",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="output_json",
        help="以 JSON 格式输出检查结果（供脚本消费）",
    )

    args = parser.parse_args()
    mode = "lite" if args.lite else "standard"
    installed, missing = check_skills(args.skills_dir, mode)
    recommended_missing = check_recommended(args.skills_dir, args.lens)

    if args.output_json:
        result = {
            "ok": len(missing) == 0,
            "mode": mode,
            "lens": args.lens,
            "skills_dir": args.skills_dir,
            "installed": [
                {"dir": d, "display_name": m["display_name"]} for d, m in installed
            ],
            "missing": [
                {
                    "dir": d,
                    "display_name": m["display_name"],
                    "used_in": m["used_in"],
                    "install_hint": m["install_hint"],
                }
                for d, m in missing
            ],
            "recommended_missing": recommended_missing,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if result["ok"] else 1)
    else:
        ok = print_report(installed, missing, args.skills_dir, mode)
        if recommended_missing:
            print()
            print(f"💡 lens={args.lens} 推荐 skill（缺失不阻塞）：")
            for r in recommended_missing:
                print(f"   ⚡ {r['display_name']} — {r['used_in']}")
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
