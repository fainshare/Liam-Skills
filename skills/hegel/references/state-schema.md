# 中间状态 Schema v2 (hegel-state.json)

---

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `workflow_id` | string | 是 | 格式 `cr-YYYYMMDD-NNN`，全局唯一 |
| `status` | enum | 是 | 见下方状态枚举 |
| `current_pass` | integer | 是 | 当前步骤编号（S0=0, S1=1, ..., S7=7） |
| `current_round` | integer | 是 | 内循环轮次（S4 入口 +1） |
| `target` | string | 是 | 分析目标描述 |
| `target_type` | enum | 是 | `code_change` \| `file` \| `module` \| `architecture` \| `custom` \| `thesis` \| `fc` \| `position_review` \| `market_event` |
| `created_at` | string | 是 | ISO 8601 |
| `updated_at` | string | 是 | ISO 8601 |
| `config` | object | 是 | 运行时配置 |
| `scope` | object | 否 | S1 定界产出（见 scope 结构） |
| `scope_history` | object[] | 否 | scope 变更历史（reassess_scope 触发时记录） |
| `claims` | object[] | 是 | S2 断言提取产出（S2 后冻结，仅 S5 可追加） |
| `claim_finding_map` | object | 是 | claim→finding 双向映射 |
| `findings` | object[] | 是 | 核心分析发现 |
| `pass_log` | object[] | 是 | 每步执行日志 |
| `convergence` | object | 是 | 收敛状态 |
| `gate_checks` | object[] | 是 | 门禁检查完整记录 |
| `gate_flags` | object[] | 是 | escalated 标记列表 |
| `gate_log` | object[] | 是 | warn 级别日志 |
| `abort_reason` | string | 否 | halt 时的终止原因 |
| `emergent_constraints` | object[] | 是 | 涌现型约束及冷却状态 |
| `drift_check` | object | 否 | S7 漂移检查结果 |

### status 枚举（7 种合法值）

`initialized` | `in_progress` | `converged` | `converged_with_blind_spots` | `truncated` | `truncated_with_blind_spots` | `aborted`

---

## config 对象

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lens` | string | `"code"` | 透镜标识（"code" \| "investment"） |
| `convergence_threshold` | float | 0.9 | 收敛比例阈值 |
| `max_extra_rounds` | integer | 2 | 最大额外迭代轮次（base） |
| `confidence_stability_delta` | float | 0.05 | confidence 稳定判定阈值（epistemic/ontological） |
| `confidence_stability_delta_deterministic` | float | 0.03 | deterministic 稳定判定阈值 |
| `ci_threshold` | float | 0.3 | epistemic CI 宽度收敛阈值 |
| `hard_cap` | integer | 4 | 安全阀硬上限（从 lens frontmatter 加载） |
| `uncertain_ratio_max` | float | 0.1 | 最大不确定比例 |
| `lite_mode` | boolean | false | 是否轻量模式 |

---

## scope 对象

S1 定界产出，结构定义见设计文档 §4.1。

| 字段 | 类型 | 说明 |
|------|------|------|
| `schema_version` | integer | 固定 1 |
| `revision` | integer | 递增，reassess_scope 时 +1 |
| `system_type` | enum | `deterministic` \| `non_deterministic` \| `mixed` |
| `system_type_rationale` | string | ≥20 字说明 |
| `dimensions` | object[] | 分析维度列表（id, name, weight, source, active） |
| `success_criteria` | object[] | 成功标准（id, description, type, params, linked_dimensions） |
| `constraints.axioms` | object[] | 公理约束（id, description, violation_action, check_type, check_rule, semantic_prompt） |
| `constraints.parameters` | object[] | 参数约束 |
| `budget` | object | `{complexity, max_safety_valve_rounds, estimated_passes}` |
| `provenance` | object | `{lens_id, user_overrides, pre_scan_inferred, auto_fill_ratio}` |

---

## scope_history[] 元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `revision` | integer | 变更后的 revision 号 |
| `reason` | string | 变更原因 |
| `claims_superseded` | integer | 被 supersede 的 claims 数 |
| `findings_dismissed` | integer | 被 dismiss 的 findings 数 |
| `timestamp` | string | ISO 8601 |

---

## claims[] 元素

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 格式 `CL-{N}`，全局递增 |
| `text` | string | 是 | 规范化陈述（一句话，可独立验证） |
| `type` | enum | 是 | `factual` \| `causal` \| `evaluative` \| `prescriptive` \| `predictive` |
| `uncertainty` | enum | 是 | `deterministic` \| `non_deterministic` \| `tbd` |
| `source_location` | object | 是 | 自由格式：code 用 file+line，investment 用 section+paragraph |
| `groundings` | object[] | 是 | Toulmin ground（`{type, content}`） |
| `implicit` | boolean | 是 | true = 提取器推断的隐含断言 |
| `confidence_extractable` | float | 是 | 提取置信度（claim 是否存在），非内容置信度 |
| `source_pass` | integer | 是 | 首次提取的步骤（通常 2，S5 追加时为 5） |
| `superseded_by_scope_revision` | integer | 否 | reassess_scope 时标记的 revision 号 |

---

## claim_finding_map 对象

```json
{
  "by_claim": { "CL-1": ["F1", "F2"] },
  "by_finding": { "F1": ["CL-1", "CL-3"] },
  "stale": ["CL-5"]
}
```

---

## findings[] 元素

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 格式 `F{N}`，全局递增 |
| `description` | string | 是 | 问题描述 |
| `category` | enum | 是 | 由当前 lens 的 §2 定义 |
| `secondary_categories` | string[] | 否 | 波及的其他维度（跨维度耦合） |
| `severity` | enum | 否 | `critical` \| `major` \| `minor` \| `info` |
| `confidence` | float | 是 | 当前置信度 0.0–1.0 |
| `confidence_history` | float[] | 是 | 每轮结束时的 confidence 快照 |
| `confidence_interval` | float[2] | 否 | 90% 可信区间 `[lower, upper]`，仅 epistemic，S5 写入 |
| `uncertainty_type` | enum | 是 | `deterministic` \| `epistemic` \| `ontological`（S3 写定） |
| `type_source` | enum | 是 | `S3_calibrate`（正常路径）\| `S5_inline`（S5 新增 finding） |
| `source_pass` | integer | 是 | 首次发现的步骤 |
| `last_reviewed_pass` | integer | 是 | 最近一次审查的步骤 |
| `status` | enum | 是 | `uncertain` \| `confirmed` \| `dismissed` \| `elevated` |
| `status_history` | string[] | 否 | 状态变更记录 `"pass{N}: old→new"` |
| `origin` | enum | 是 | `claim_derived`（S3 从 claim 派生）\| `structural_discovery`（S4/S5 结构性发现或 code-review-skill 直出） |
| `claim_refs` | string[] | 否 | 关联的 claim ID（origin=claim_derived 时必填） |
| `claim_type` | enum | 否 | 从 `claims[claim_refs[0]].type` 冗余存储，origin=structural_discovery 时为 null |
| `evidence` | object[] | 是 | 支撑证据列表 |
| `evidence[].content` | string | 是 | 证据内容 |
| `evidence[].source` | string | 是 | 来源 |
| `evidence[].type` | enum | 是 | 由当前 lens 的 §7 定义 |
| `counterarguments` | object[] | 否 | 反面论据 |
| `counterarguments[].content` | string | 是 | 内容 |
| `counterarguments[].addressed` | boolean | 是 | 是否已回应 |
| `bayesian_priors` | object | 否 | `{prior, likelihood, posterior, evidence_strength}` |
| `feynman_flags` | object[] | 否 | `{type, description, pass}` |
| `deepen_notes` | object[] | 否 | `{dimension, assessment}`，dimension 由 lens §6 定义 |
| `deepdig_record` | object | 否 | `{strategy: "D1"\|"D2"\|"D3"\|"D4", rationale, outcome}` |
| `inherited_from` | string | 否 | 重分类时源 finding ID（如 `"F3"`） |
| `snap_back_detected` | boolean | 否 | 条件先验重置后后验落入 ±0.05 区间 |

---

## pass_log[] 元素

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pass` | integer | 是 | 步骤编号（S0=0 ... S7=7） |
| `round` | integer | 是 | 所属内循环轮次 |
| `skill` | string | 是 | 执行的 skill 名称 |
| `findings_added` | integer | 是 | 本步骤新增 finding 数 |
| `findings_updated` | integer | 是 | 本步骤更新 finding 数 |
| `findings_dismissed` | integer | 是 | 本步骤排除 finding 数 |
| `notes` | string | 否 | 执行备注 |

---

## convergence 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `total_findings` | integer | 是 | finding 总数 |
| `confirmed` | integer | 是 | 已确认数 |
| `dismissed` | integer | 是 | 已排除数 |
| `uncertain` | integer | 是 | 仍不确定数 |
| `elevated` | integer | 是 | 已升级为阻塞项数 |
| `convergence_ratio` | float | 是 | `(confirmed + dismissed) / total` |
| `threshold` | float | 是 | 收敛阈值 |
| `max_confidence_delta` | float | 是 | 最近 2 轮最大 confidence 变化 |
| `new_findings_last_pass` | integer | 是 | 最近一步新增 finding 数 |
| `status_flips_last_pass` | integer | 是 | 最近一步状态翻转数 |
| `is_converged` | boolean | 是 | 是否满足收敛条件 |
| `by_type` | object | 是 | 按 uncertainty_type 分类的收敛统计 |

### convergence.by_type 结构

```json
{
  "deterministic": { "total": 5, "converged": 4, "pending": 1 },
  "epistemic":     { "total": 3, "converged": 2, "pending": 1 },
  "ontological":   { "total": 2, "converged": 1, "pending": 1 }
}
```

收敛判定逻辑见 `convergence-criteria.md`。

---

## gate_checks[] 元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `step` | integer | 触发步骤 |
| `round` | integer | 所属轮次 |
| `constraint_id` | string | 约束 ID（AX1, PM1, 等） |
| `check_type` | enum | `structural` \| `semantic` |
| `result` | enum | `pass` \| `warn` \| `escalate` \| `halt` \| `reassess_scope` |
| `detail` | string | 检查详情 |
| `timestamp` | string | ISO 8601 |

---

## gate_flags[] 元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `constraint_id` | string | 约束 ID |
| `severity` | string | `escalated` |
| `consecutive_count` | integer | 连续 escalate 次数（≥2 自动升为 halt） |
| `unresolved` | boolean | 是否未解决 |

---

## emergent_constraints[] 元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 格式 `EM-{N}` |
| `description` | string | 约束描述 |
| `status` | enum | `cooling` \| `promoted` \| `dismissed` |
| `discovered_at_step` | integer | 发现步骤 |
| `reviewed_at_step` | integer | feynman 审查步骤 |

---

## drift_check 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `has_drift` | boolean | 是否检测到漂移 |
| `blind_spots` | string[] | 识别到的盲区 |
| `scope_coverage` | float | S1 scope 覆盖率 |
