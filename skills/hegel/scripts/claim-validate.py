#!/usr/bin/env python3
"""
hegel: S2 claim-extract 后验证（schema 合规检查）

用法:
    python3 scripts/claim-validate.py [state_file]

退出码:
    0  全部通过
    1  有 error 级违规
    3  输入文件错误
"""

import json
import sys
import os

VALID_CLAIM_TYPES = {"factual", "causal", "evaluative", "prescriptive", "predictive"}
VALID_UNCERTAINTY = {"deterministic", "non_deterministic", "tbd"}


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


def validate_claims(claims):
    errors = []
    warnings = []
    seen_ids = set()

    if not claims:
        errors.append("无 claims（S2 未执行或产出为空）")
        return errors, warnings

    for i, claim in enumerate(claims):
        prefix = f"CL[{i}]"

        cid = claim.get("id")
        if not cid:
            errors.append(f"{prefix}: 缺少 id")
        elif cid in seen_ids:
            errors.append(f"{prefix}: 重复 id '{cid}'")
        else:
            seen_ids.add(cid)
            prefix = cid

        if not claim.get("text"):
            errors.append(f"{prefix}: 缺少 text")

        ctype = claim.get("type")
        if ctype not in VALID_CLAIM_TYPES:
            errors.append(f"{prefix}: type '{ctype}' 不在枚举 {VALID_CLAIM_TYPES}")

        uncertainty = claim.get("uncertainty")
        if uncertainty not in VALID_UNCERTAINTY:
            errors.append(f"{prefix}: uncertainty '{uncertainty}' 不在枚举 {VALID_UNCERTAINTY}")

        if not claim.get("source_location"):
            warnings.append(f"{prefix}: 缺少 source_location")

        groundings = claim.get("groundings", [])
        if not groundings:
            warnings.append(f"{prefix}: 无 groundings（Toulmin 要求至少一个 ground）")

        if "implicit" not in claim:
            warnings.append(f"{prefix}: 缺少 implicit 字段")

        ce = claim.get("confidence_extractable")
        if ce is not None and not (0.0 <= ce <= 1.0):
            errors.append(f"{prefix}: confidence_extractable={ce} 超出 [0,1]")

    return errors, warnings


def main():
    state_file = sys.argv[1] if len(sys.argv) > 1 else "hegel-state.json"
    state = load_state(state_file)
    claims = state.get("claims", [])

    errors, warnings = validate_claims(claims)

    result = {"errors": errors, "warnings": warnings, "passed": len(errors) == 0, "total_claims": len(claims)}
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if errors:
        print(f"\n❌ {len(errors)} 项 error", file=sys.stderr)
        sys.exit(1)
    elif warnings:
        print(f"\n⚠️  {len(warnings)} 项 warning，claims 结构合规", file=sys.stderr)
        sys.exit(0)
    else:
        print(f"\n✅ {len(claims)} 条 claims 全部合规", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
