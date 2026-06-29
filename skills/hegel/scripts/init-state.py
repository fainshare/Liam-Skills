#!/usr/bin/env python3
"""
hegel: 初始化中间状态文件 v2

用法:
    python3 scripts/init-state.py --target "PR #1234" [--target-type code_change] [--lens code] [--lite] [--threshold 0.9] [--max-rounds 2]

产出:
    创建 hegel-state.json（v2 schema，含 scope/claims/gate 骨架）
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LENS_SECTIONS = ["§1", "§2", "§3", "§4", "§5", "§6", "§7"]


def generate_workflow_id():
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    state_dir = os.getcwd()
    existing = [
        f for f in os.listdir(state_dir)
        if f.startswith("hegel-state") and f.endswith(".json")
    ]
    seq = len(existing) + 1
    return f"cr-{today}-{seq:03d}"


def find_lens_file(lens_id):
    """搜索 lens 文件，返回路径或 None"""
    candidates = [
        Path(__file__).parent.parent / "references" / f"lens-{lens_id}.md",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def validate_lens(lens_path):
    """校验 lens 文件 7-section 结构（L1-L7 简化版）"""
    content = lens_path.read_text(encoding="utf-8")
    errors = []

    # L1: frontmatter 含 lens_id, version, hard_cap
    fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        errors.append("L1: 无 YAML frontmatter")
    else:
        fm = fm_match.group(1)
        for field in ["lens_id", "version", "hard_cap"]:
            if field not in fm:
                errors.append(f"L1: frontmatter 缺少 {field}")

    # L2: §1-§7 section 标题全部存在
    for s in LENS_SECTIONS:
        if s not in content:
            errors.append(f"L2: 缺少 {s} section")

    return errors


def parse_lens_hard_cap(lens_path):
    """从 lens 文件 frontmatter 解析 hard_cap"""
    content = lens_path.read_text(encoding="utf-8")
    match = re.search(r"hard_cap:\s*(\d+)", content)
    if match:
        return int(match.group(1))
    return 4  # 默认


def create_initial_state(target, target_type, lens_id, lite_mode, threshold, max_rounds, hard_cap):
    now = datetime.now(timezone.utc).isoformat()

    state = {
        "workflow_id": generate_workflow_id(),
        "status": "initialized",
        "current_pass": 0,
        "current_round": 0,
        "target": target,
        "target_type": target_type,
        "created_at": now,
        "updated_at": now,
        "config": {
            "lens": lens_id,
            "convergence_threshold": threshold,
            "max_extra_rounds": max_rounds,
            "confidence_stability_delta": 0.05,
            "confidence_stability_delta_deterministic": 0.03,
            "ci_threshold": 0.3,
            "uncertain_ratio_max": 0.1,
            "lite_mode": lite_mode,
            "hard_cap": hard_cap,
        },
        "scope": None,
        "scope_history": [],
        "claims": [],
        "claim_finding_map": {
            "by_claim": {},
            "by_finding": {},
            "stale": [],
        },
        "findings": [],
        "pass_log": [],
        "convergence": {
            "total_findings": 0,
            "confirmed": 0,
            "dismissed": 0,
            "uncertain": 0,
            "elevated": 0,
            "convergence_ratio": 0.0,
            "threshold": threshold,
            "max_confidence_delta": 0.0,
            "new_findings_last_pass": 0,
            "status_flips_last_pass": 0,
            "is_converged": False,
            "by_type": {
                "deterministic": {"total": 0, "converged": 0, "pending": 0},
                "epistemic": {"total": 0, "converged": 0, "pending": 0},
                "ontological": {"total": 0, "converged": 0, "pending": 0},
            },
        },
        "gate_checks": [],
        "gate_flags": [],
        "gate_log": [],
        "emergent_constraints": [],
    }
    return state


def main():
    parser = argparse.ArgumentParser(description="初始化 hegel 中间状态 v2")
    parser.add_argument("--target", required=True, help="分析目标描述")
    parser.add_argument(
        "--target-type",
        default="code_change",
        choices=[
            "code_change", "file", "module", "architecture", "custom",
            "thesis", "fc", "position_review", "market_event",
        ],
        help="目标类型",
    )
    parser.add_argument("--lens", default="code", help="透镜标识（code | investment）")
    parser.add_argument("--lite", action="store_true", help="轻量模式")
    parser.add_argument("--threshold", type=float, default=0.9, help="收敛阈值")
    parser.add_argument("--max-rounds", type=int, default=2, help="最大额外迭代轮次")
    parser.add_argument("--output", default="hegel-state.json", help="输出文件路径")

    args = parser.parse_args()

    if not 0.0 <= args.threshold <= 1.0:
        print(f"ERROR: threshold 必须在 0.0-1.0 之间: {args.threshold}", file=sys.stderr)
        sys.exit(1)
    if args.max_rounds < 1:
        print(f"ERROR: max-rounds 必须 >= 1: {args.max_rounds}", file=sys.stderr)
        sys.exit(1)

    # lens 文件校验
    lens_path = find_lens_file(args.lens)
    if not lens_path:
        print(f"ERROR: 找不到 lens 文件: lens-{args.lens}.md", file=sys.stderr)
        sys.exit(1)

    lens_errors = validate_lens(lens_path)
    if lens_errors:
        print(f"ERROR: lens-{args.lens}.md 校验失败:", file=sys.stderr)
        for e in lens_errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    hard_cap = parse_lens_hard_cap(lens_path)

    if args.max_rounds > hard_cap:
        print(f"WARNING: max-rounds ({args.max_rounds}) > hard_cap ({hard_cap})，已裁剪", file=sys.stderr)
        args.max_rounds = hard_cap

    if os.path.exists(args.output):
        print(f"WARNING: {args.output} 已存在，将被覆盖", file=sys.stderr)

    state = create_initial_state(
        target=args.target,
        target_type=args.target_type,
        lens_id=args.lens,
        lite_mode=args.lite,
        threshold=args.threshold,
        max_rounds=args.max_rounds,
        hard_cap=hard_cap,
    )

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    print(f"OK: {args.output} 已创建 (workflow_id={state['workflow_id']})")
    print(f"    target: {args.target}")
    print(f"    target_type: {args.target_type}")
    print(f"    lens: {args.lens} (hard_cap={hard_cap})")
    print(f"    lite_mode: {args.lite}")
    print(f"    threshold: {args.threshold}")
    print(f"    max_extra_rounds: {args.max_rounds}")


if __name__ == "__main__":
    main()
