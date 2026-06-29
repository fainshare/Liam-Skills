#!/usr/bin/env python3
"""
hegel: 收敛判定脚本 v2

用法:
    python3 scripts/check-convergence.py [state_file]

退出码:
    0  已收敛（C1-C5 全部满足）
    1  未收敛（需继续内循环）
    2  强制终止（安全阀/天花板）
    3  输入文件错误
"""

import json
import sys
import os
from datetime import datetime, timezone


def load_state(path):
    if not os.path.exists(path):
        print(f"ERROR: 状态文件不存在: {path}", file=sys.stderr)
        sys.exit(3)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON 解析失败: {e}", file=sys.stderr)
        sys.exit(3)


def get_delta_for_type(uncertainty_type, config):
    if uncertainty_type == "deterministic":
        return config.get("confidence_stability_delta_deterministic", 0.03)
    return config.get("confidence_stability_delta", 0.05)


def _history_value(entry):
    """兼容 float[] 和 [{pass, value, source}] 两种格式"""
    if isinstance(entry, (int, float)):
        return float(entry)
    return float(entry.get("value", 0))


def check_c1_confidence_stable(findings, config):
    """C1: 按 uncertainty_type 分化的 stability_delta"""
    violations = []
    for f in findings:
        history = f.get("confidence_history", [])
        if len(history) < 2:
            continue
        delta = abs(_history_value(history[-1]) - _history_value(history[-2]))
        threshold = get_delta_for_type(f.get("uncertainty_type", "epistemic"), config)
        if delta >= threshold:
            violations.append({
                "finding_id": f["id"],
                "uncertainty_type": f.get("uncertainty_type"),
                "delta": round(delta, 4),
                "threshold": threshold,
            })
    return len(violations) == 0, violations


def check_c2_no_new_findings(pass_log):
    """C2: 最近一步未产生新 finding"""
    if not pass_log:
        return True, []
    last = pass_log[-1]
    added = last.get("findings_added", 0)
    if added > 0:
        return False, [{"findings_added": added, "pass": last.get("pass")}]
    return True, []


def check_c3_no_flips_and_pseudo_stable(findings, current_pass):
    """C3: 无翻转 + 伪稳定检测（仅 epistemic）"""
    flips = []
    pseudo_stable = []

    for f in findings:
        # 翻转检测
        for sh in f.get("status_history", []):
            if isinstance(sh, str) and f"pass{current_pass}" in sh and "->uncertain" in sh:
                flips.append({"finding_id": f["id"], "transition": sh})

        # 伪稳定检测（仅 epistemic）
        if f.get("uncertainty_type") == "epistemic":
            ci = f.get("confidence_interval")
            ci_history = f.get("ci_history", [])
            if ci and len(ci_history) >= 3:
                recent_deltas = [
                    abs(ci_history[i][1] - ci_history[i][0] - (ci_history[i-1][1] - ci_history[i-1][0]))
                    for i in range(-2, 0)
                ]
                if all(d < 0.02 for d in recent_deltas):
                    deepen = f.get("deepen_notes", [])
                    recent_deepen = [n for n in deepen if n.get("round", 0) >= len(ci_history) - 2]
                    if not recent_deepen:
                        pseudo_stable.append({"finding_id": f["id"], "ci_width": round(ci[1] - ci[0], 4)})

    return len(flips) == 0, flips, pseudo_stable


def check_finding_converged(finding, config):
    """C4: 单个 finding 的类型感知收敛判定"""
    ut = finding.get("uncertainty_type", "epistemic")

    if ut == "deterministic":
        c = finding.get("confidence", 0.5)
        return c >= 0.85 or c <= 0.15

    elif ut == "epistemic":
        ci = finding.get("confidence_interval")
        if ci is not None:
            ci_threshold = config.get("ci_threshold", 0.3)
            return (ci[1] - ci[0]) < ci_threshold
        # Fallback: 无 CI 时用 confidence_history delta 稳定性判定
        history = finding.get("confidence_history", [])
        if len(history) < 2:
            return False
        delta = abs(_history_value(history[-1]) - _history_value(history[-2]))
        return delta < config.get("confidence_stability_delta", 0.05)

    elif ut == "ontological":
        history = finding.get("confidence_history", [])
        if len(history) < 2:
            return False
        delta = abs(_history_value(history[-1]) - _history_value(history[-2]))
        return delta < config.get("confidence_stability_delta", 0.05)

    return False


def check_c4_type_aware(findings, config, pseudo_stable_ids=None):
    """C4: 类型感知收敛判定（pseudo_stable findings 不算已收敛）"""
    if pseudo_stable_ids is None:
        pseudo_stable_ids = set()
    if not findings:
        empty_by_type = {
            "deterministic": {"total": 0, "converged": 0, "pending": 0},
            "epistemic": {"total": 0, "converged": 0, "pending": 0},
            "ontological": {"total": 0, "converged": 0, "pending": 0},
        }
        return False, [{"reason": "total_findings == 0"}], empty_by_type

    not_converged = []
    by_type = {
        "deterministic": {"total": 0, "converged": 0, "pending": 0},
        "epistemic": {"total": 0, "converged": 0, "pending": 0},
        "ontological": {"total": 0, "converged": 0, "pending": 0},
    }

    for f in findings:
        if f.get("status") == "dismissed":
            continue
        ut = f.get("uncertainty_type", "epistemic")
        if ut not in by_type:
            ut = "epistemic"
        by_type[ut]["total"] += 1

        if f["id"] in pseudo_stable_ids:
            by_type[ut]["pending"] += 1
            not_converged.append({
                "finding_id": f["id"],
                "uncertainty_type": ut,
                "reason": "pseudo_stable",
            })
        elif check_finding_converged(f, config):
            by_type[ut]["converged"] += 1
        else:
            by_type[ut]["pending"] += 1
            not_converged.append({
                "finding_id": f["id"],
                "uncertainty_type": ut,
                "confidence": f.get("confidence"),
            })

    all_converged = all(t["pending"] == 0 for t in by_type.values() if t["total"] > 0)
    return all_converged, not_converged, by_type


def check_c5_no_violations(gate_flags):
    """C5: 无未解决的 escalated 约束违规"""
    unresolved = [
        gf for gf in gate_flags
        if gf.get("severity") == "escalated" and gf.get("unresolved", True)
    ]
    return len(unresolved) == 0, unresolved


def check_safety_valve(current_round, config, findings):
    """安全阀检查"""
    base = config.get("max_extra_rounds", 2)
    has_onto = any(f.get("uncertainty_type") == "ontological" for f in findings)
    onto_bonus = 1 if has_onto else 0
    max_rounds = base + onto_bonus
    hard_cap = config.get("hard_cap", 4)

    exceeded_max = current_round > max_rounds
    exceeded_cap = current_round > hard_cap

    return exceeded_max or exceeded_cap, {
        "current_round": current_round,
        "max_rounds": max_rounds,
        "hard_cap": hard_cap,
        "base": base,
        "onto_bonus": onto_bonus,
        "exceeded_max": exceeded_max,
        "exceeded_cap": exceeded_cap,
    }


def check_plateau(pass_log, window=2):
    """连续 N 轮指标无变化（天花板）"""
    if len(pass_log) < window * 2:
        return False
    recent = pass_log[-window:]
    prev = pass_log[-window * 2:-window]
    recent_activity = sum(p.get("findings_added", 0) + p.get("findings_updated", 0) for p in recent)
    prev_activity = sum(p.get("findings_added", 0) + p.get("findings_updated", 0) for p in prev)
    return recent_activity == 0 and prev_activity == 0


def evaluate(state):
    config = state.get("config", {})
    findings = state.get("findings", [])
    pass_log = state.get("pass_log", [])
    convergence = state.get("convergence", {})
    gate_flags = state.get("gate_flags", [])
    current_pass = state.get("current_pass", 0)
    current_round = state.get("current_round", 0)

    # 排除 dismissed findings 参与判定
    active_findings = [f for f in findings if f.get("status") != "dismissed"]

    c1_pass, c1_detail = check_c1_confidence_stable(active_findings, config)
    c2_pass, c2_detail = check_c2_no_new_findings(pass_log)
    c3_pass, c3_detail, pseudo_stable = check_c3_no_flips_and_pseudo_stable(active_findings, current_pass)
    pseudo_stable_ids = {ps["finding_id"] for ps in pseudo_stable}
    c4_pass, c4_detail, by_type = check_c4_type_aware(active_findings, config, pseudo_stable_ids)
    c5_pass, c5_detail = check_c5_no_violations(gate_flags)

    is_converged = c1_pass and c2_pass and c3_pass and c4_pass and c5_pass
    is_safety_valve, valve_detail = check_safety_valve(current_round, config, active_findings)
    is_plateau = check_plateau(pass_log)

    # 确定终止原因（converged 优先：若 C1-C5 全通过则为真收敛，即使恰在安全阀边界）
    termination_reason = None
    if is_converged:
        termination_reason = "converged"
    elif is_safety_valve:
        termination_reason = "safety_valve"
    elif is_plateau:
        termination_reason = "analysis_ceiling"

    should_terminate = termination_reason is not None

    uncertain_findings = [
        {"id": f["id"], "description": f["description"], "confidence": f["confidence"],
         "uncertainty_type": f.get("uncertainty_type")}
        for f in active_findings if f.get("status") == "uncertain"
    ]

    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "workflow_id": state.get("workflow_id"),
        "current_pass": current_pass,
        "current_round": current_round,
        "should_terminate": should_terminate,
        "termination_reason": termination_reason,
        "checks": {
            "c1_confidence_stable": {"passed": c1_pass, "violations": c1_detail},
            "c2_no_new_findings": {"passed": c2_pass, "violations": c2_detail},
            "c3_no_flips": {"passed": c3_pass, "violations": c3_detail, "pseudo_stable": pseudo_stable},
            "c4_type_aware": {"passed": c4_pass, "violations": c4_detail, "by_type": by_type},
            "c5_no_violations": {"passed": c5_pass, "violations": c5_detail},
        },
        "safety_valve": valve_detail,
        "summary": {
            "total_findings": len(active_findings),
            "confirmed": sum(1 for f in active_findings if f.get("status") == "confirmed"),
            "dismissed": sum(1 for f in findings if f.get("status") == "dismissed"),
            "uncertain": sum(1 for f in active_findings if f.get("status") == "uncertain"),
            "elevated": sum(1 for f in active_findings if f.get("status") == "elevated"),
            "by_type": by_type,
        },
        "uncertain_findings": uncertain_findings,
        "next_action": (
            "output_final_report" if should_terminate
            else "continue_to_S4"
        ),
    }

    # 零假设覆盖率检查：confirm_no_change 占比 = 0% 时输出 warning
    # claim_category 继承自源 claim（claim-extract-core.md §claim_category），
    # 与 finding.category（lens §2 领域分类）是不同层面的概念
    total_with_category = len(active_findings)
    confirm_no_change_count = sum(
        1 for f in active_findings if f.get("claim_category") == "confirm_no_change"
    )
    if total_with_category > 0 and confirm_no_change_count == 0:
        result.setdefault("warnings", []).append({
            "type": "zero_hypothesis_coverage",
            "message": "confirm_no_change 占比 = 0%：分析框架可能存在确认偏差（预设「原方案有问题」），未检验零假设。建议补充「确认合理」类别的 finding。",
        })
    elif total_with_category > 0:
        ratio = confirm_no_change_count / total_with_category
        result["summary"]["confirm_no_change_ratio"] = round(ratio, 2)
        if ratio < 0.15:
            result.setdefault("warnings", []).append({
                "type": "low_zero_hypothesis_coverage",
                "message": f"confirm_no_change 占比 = {ratio:.0%}（< 15%）：零假设检验不足，分析可能过度聚焦于找问题。",
            })

    return result, should_terminate, is_safety_valve


def main():
    state_file = sys.argv[1] if len(sys.argv) > 1 else "hegel-state.json"
    state = load_state(state_file)
    result, should_terminate, is_safety_valve = evaluate(state)

    print(json.dumps(result, ensure_ascii=False, indent=2))

    if result["termination_reason"] == "converged":
        sys.exit(0)
    elif should_terminate:
        sys.exit(2)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
