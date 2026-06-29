#!/usr/bin/env python3
"""
hegel: S1 scope 结构校验（V1-V10）

用法:
    python3 scripts/scope-validate.py <state_file>

退出码:
    0  全部通过
    1  有 error 级违规（阻塞管线）
    2  仅 warning 级（管线继续，输出告警）
    3  输入文件错误
"""

import json
import sys
import os
import re

VALID_SYSTEM_TYPES = {"deterministic", "non_deterministic", "mixed"}
VALID_VIOLATION_ACTIONS = {"halt", "escalate", "warn", "reassess_scope"}
VALID_COMPLEXITY = {"low", "medium", "high"}


def load_state(path):
    if not os.path.exists(path):
        print(f"ERROR: 文件不存在: {path}", file=sys.stderr)
        sys.exit(3)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON 解析失败: {e}", file=sys.stderr)
        sys.exit(3)


def validate(scope, hard_cap, lens="code"):
    errors = []
    warnings = []

    # V1: schema_version 存在且为正整数
    sv = scope.get("schema_version")
    if not isinstance(sv, int) or sv < 1:
        errors.append("V1: schema_version 缺失或非正整数")

    # V2: system_type 在枚举值内
    st = scope.get("system_type")
    if st not in VALID_SYSTEM_TYPES:
        errors.append(f"V2: system_type '{st}' 不在枚举 {VALID_SYSTEM_TYPES}")

    # V3: system_type_rationale 长度 ≥20 字
    rationale = scope.get("system_type_rationale", "")
    if len(rationale) < 20:
        errors.append(f"V3: system_type_rationale 长度 {len(rationale)} < 20")

    # V4: dimensions 至少 1 个 active=true
    dims = scope.get("dimensions", [])
    active_dims = [d for d in dims if d.get("active", False)]
    if not active_dims:
        errors.append("V4: 无 active=true 的 dimension")

    # V5: success_criteria 的 linked_dimensions 引用存在的 dimension.id
    dim_ids = {d.get("id") for d in dims}
    for sc in scope.get("success_criteria", []):
        for linked in sc.get("linked_dimensions", []):
            if linked not in dim_ids:
                errors.append(f"V5: success_criteria '{sc.get('id')}' 引用不存在的 dimension '{linked}'")

    # V6: axiom 的 check_rule（structural 型）为合法 Python 表达式
    constraints = scope.get("constraints", {})
    for ax in constraints.get("axioms", []):
        if ax.get("check_type") == "structural" and ax.get("check_rule"):
            try:
                compile(ax["check_rule"], "<axiom>", "eval")
            except SyntaxError as e:
                errors.append(f"V6: axiom '{ax.get('id')}' check_rule 语法错误: {e}")

    # V7: budget.max_safety_valve_rounds ≤ hard_cap
    budget = scope.get("budget", {})
    max_svr = budget.get("max_safety_valve_rounds", 2)
    if max_svr > hard_cap:
        errors.append(f"V7: max_safety_valve_rounds ({max_svr}) > hard_cap ({hard_cap})")

    # V7b: budget.estimated_passes ≤ hard_cap（warn 级）
    est_passes = budget.get("estimated_passes")
    if est_passes is not None and est_passes > hard_cap:
        warnings.append(f"V7b: estimated_passes ({est_passes}) > hard_cap ({hard_cap})，预估超限")

    # V8: provenance.auto_fill_ratio 不超过 0.8（code lens 快速路径豁免）
    prov = scope.get("provenance", {})
    afr = prov.get("auto_fill_ratio", 0.0)
    if afr > 0.8 and lens != "code":
        warnings.append(f"V8: auto_fill_ratio ({afr}) > 0.8，用户输入可能不足")

    # V9: 无重复的 dimension.id 或 constraint.id
    all_ids = []
    for d in dims:
        all_ids.append(d.get("id"))
    for ax in constraints.get("axioms", []):
        all_ids.append(ax.get("id"))
    for pm in constraints.get("parameters", []):
        all_ids.append(pm.get("id"))
    seen = set()
    for id_ in all_ids:
        if id_ and id_ in seen:
            errors.append(f"V9: 重复 ID '{id_}'")
        seen.add(id_)

    # V10: 至少一个 axiom 或 parameter
    axioms = constraints.get("axioms", [])
    params = constraints.get("parameters", [])
    if not axioms and not params:
        warnings.append("V10: 无任何约束（axiom/parameter），纯无约束分析")

    return errors, warnings


def main():
    if len(sys.argv) < 2:
        print("用法: scope-validate.py <state_file>", file=sys.stderr)
        sys.exit(3)

    state = load_state(sys.argv[1])
    scope = state.get("scope")
    if not scope:
        print("ERROR: state.json 中无 scope 字段", file=sys.stderr)
        sys.exit(3)

    config = state.get("config", {})
    hard_cap = config.get("hard_cap", 4)
    lens = config.get("lens", "code")

    errors, warnings = validate(scope, hard_cap, lens)

    # 输出结果
    result = {"errors": errors, "warnings": warnings, "passed": len(errors) == 0}
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if errors:
        print(f"\n❌ {len(errors)} 项 error，管线阻塞", file=sys.stderr)
        sys.exit(1)
    elif warnings:
        print(f"\n⚠️  {len(warnings)} 项 warning，管线继续", file=sys.stderr)
        sys.exit(2)
    else:
        print("\n✅ scope 校验全部通过", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
