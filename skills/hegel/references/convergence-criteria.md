# 收敛判定标准 v2

---

## 核心变化

v1 对所有 findings 用统一标准（≥0.85 确认 / ≤0.15 排除）。v2 按 uncertainty_type 分治：

- **deterministic** → 二值判定（0.85/0.15），与 v1 相同
- **epistemic** → 区间窄化（CI 宽度 < ci_threshold），承认信息不足但限定范围
- **ontological** → 概率分布稳定（连续 2 轮 delta < 0.05），承认本质无确定答案

ontological finding 的 confidence = 0.45 是合法终态——只要分布不再漂移。

---

## 五项收敛条件

**全部满足时**终止迭代（S6 exit code = 0）。

### C1: 置信度稳定

所有 findings 最近 2 轮 confidence 变化 < stability_delta。

| uncertainty_type | stability_delta | 理由 |
|------------------|----------------|------|
| deterministic | 0.03 | 二值趋近极端值，小变化有意义 |
| epistemic | 0.05 | 区间窄化有固有噪声 |
| ontological | 0.05 | 概率分布有固有噪声 |

仅被审查过 1 轮的 finding（confidence_history 长度 = 1）跳过此检查。

### C2: 无新增 finding

最近一步的 `pass_log[-1].findings_added == 0`。

### C3: 无翻转 + 伪稳定检测

最近一步无 `confirmed→uncertain` 或 `dismissed→uncertain` 回退。

**伪稳定检测（仅 epistemic）**：epistemic finding 若 CI 宽度连续 3 轮变化 < 0.02 且 deepen_notes 无新增 evidence source，标记 `pseudo_stable`。伪稳定不算真收敛，报告标注"证据搜索可能触达天花板"。

**Ontological 不适用伪稳定检测**——概率分布稳定本身即收敛信号，不要求 evidence 持续变化。

### C4: 类型感知收敛判定

按 uncertainty_type 分别判定每个 finding 是否已收敛：

```python
for finding in findings:
    if finding.uncertainty_type == "deterministic":
        converged = finding.confidence >= 0.85 or finding.confidence <= 0.15
    elif finding.uncertainty_type == "epistemic":
        ci = finding.confidence_interval
        if ci is None:  # S5 尚未填充 CI
            converged = False
        else:
            converged = (ci[1] - ci[0]) < ci_threshold  # 默认 0.3
    elif finding.uncertainty_type == "ontological":
        converged = confidence_stable(finding, rounds=2, delta=0.05)
```

**边界情况**：`total_findings == 0` → C4 返回 false（零 findings 不判定为 converged，触发 gate_check escalate）。

### C5: 无约束违规

所有 `gate_flags[]` 中 `severity=="escalated" && unresolved==true` 的条目 == 0。

C5 独立于 C4——confirmed finding 不应因违规被回退为 uncertain。

---

## 安全阀参数化

```
max_rounds = base + onto_bonus
base = scope.budget.max_safety_valve_rounds（默认 2）
onto_bonus = 1 if any finding.uncertainty_type == "ontological" else 0
hard_cap = lens 级参数（lens-code: 4, lens-investment: 6）
```

**强制终止条件**（无论 C1-C5 是否满足）：

| 条件 | 行为 |
|------|------|
| `current_round > max_rounds` | status → truncated 系列 |
| `current_round > hard_cap` | 绝对上限，不可被 max_rounds 覆盖 |
| 连续 2 轮指标无任何变化（天花板） | status → truncated 系列 |
| 用户主动终止 | status → aborted |

---

## S6/S7 正交性

| | S6 收敛 | S7 漂移检查 |
|---|---------|-----------|
| 关注维度 | 深度（findings 是否稳定） | 广度（S1 边界是否仍有效） |
| 触发机制 | 每轮自动 | 仅最终报告前 |
| 发现问题 | 回到 S4（内循环） | 标记 blind spots，不回退 |

---

## 七种终态

| 终态 | S6 结果 | S7 漂移 | 含义 |
|------|---------|---------|------|
| converged | 收敛 | 无漂移 | 分析完成，结论可信 |
| converged_with_blind_spots | 收敛 | 有漂移 | 收敛但边界可能遗漏 |
| truncated | 安全阀截断 | 无漂移 | 部分未收敛，需人工判断 |
| truncated_with_blind_spots | 安全阀截断 | 有漂移 | 最不理想，建议重新定界 |
| aborted | — | — | gate halt 或用户终止 |

另有 `initialized`（S0 后）和 `in_progress`（S1-S6 期间）两个非终态。

---

## uncertainty_type 重分类

S5 发现 uncertainty_type 判定有误时：新增 finding（带修正后 type）+ dismiss 原 finding。

**证据继承**：
- `evidence[]` 和 `deepen_notes[]` 快照副本（标记 `inherited_from`）
- `feynman_flags[]` 不继承（与类型相关）
- `bayesian_priors[]` 不继承，初始 confidence 取旧 finding 最后值
- 收敛计数器从 `round_of_reclassification - 1` 开始（非归零）

---

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 已收敛（C1-C5 全部满足） |
| 1 | 未收敛（需继续内循环） |
| 2 | 强制终止（安全阀/天花板） |
| 3 | 输入文件错误 |
