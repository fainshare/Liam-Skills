，---
lens_id: specification-bridge
version: 1.0.0
hard_cap: 3
compatible_with: "hegel-v2-design 2026-06-09"
---

# 规格化桥接透镜（lens-specification-bridge）

> 将 hegel 收敛报告的 findings[] 转化为结构化的 requirements doc（PF + R-numbered + SC-numbered），作为 ce-plan/ce-brainstorm 的直接输入。
> 解决 GENE:spec-gate 指出的「太虚产出≠规格化产出」断层。

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `hegel_findings` \| `analysis_to_spec` |
| system_type_default | `deterministic` |
| trigger_condition | `config.lens == "specification-bridge" \|\| target_type in ["hegel_findings", "analysis_to_spec"]` |

### 快速路径

无。规格化桥接必须经过完整管线——需要对每条 finding 执行"可规格化判定"，不可跳过。

### 输入格式约定

期望输入为 hegel 收敛报告中的 findings[] 数组（JSON 或 markdown 表格）。每条 finding 需包含：
- `id`, `description`, `category`, `severity`, `confidence`, `status`, `uncertainty_type`

如果输入是完整的 hegel 报告 markdown，S2 将从中提取 findings 表格/列表。此为文档级操作指引，init-state.py 不做自动格式校验。

### 转换 lens 特殊性

此 lens 是**转换型**而非分析型：
- S2 不从外部文本提取 claims，而是从 findings[] 中筛选 status=confirmed 或 status=uncertain 的条目
- S3-S5 不执行贝叶斯校准/feynman 审查/deepen 深化，而是执行"可规格化判定"
- S6 收敛判定简化为"所有可规格化条目均已转化"
- S7 产出是结构化 requirements doc，而非传统收敛报告

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| spec_eligible | 这条 finding 能否转化为 R-numbered requirement？ |
| spec_blocked | 这条 finding 为什么不能直接规格化？缺少什么信息？ |
| scope_mismatch | 这条 finding 是否超出当前规格化的范围？ |
| priority_conflict | 多条 finding 转化为 requirement 后是否存在优先级冲突？ |
| success_criteria_gap | 这条 requirement 是否有可验证的成功标准？ |
| dependency_chain | 这条 requirement 是否依赖其他 requirement 先完成？ |
| decomposition_needed | 这条 finding 是否需要拆分为多条 requirement？ |

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | confirmed finding 无法转化为 requirement（规格化链路断裂） | confidence ≥ 0.6，否则降为 major |
| major | finding 可规格化但缺少成功标准或依赖关系未明确 | — |
| minor | finding 可规格化但需要拆分或优先级调整 | — |
| info | 观察性发现，暂不需要规格化 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| status=confirmed 且 confidence≥0.85 的 finding | 0.80–0.95 | 可直接转化为 MUST requirement |
| status=uncertain 且 confidence≥0.50 的 finding | 0.50–0.70 | 可转化为 SHOULD requirement，需标注待验证 |
| status=dismissed 但有 debono 价值点的 finding | 0.30–0.50 | 转化为 COULD requirement 或记录为 future consideration |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 规格化桥接领域示例 |
|------------------|-------------------|
| deterministic | "这条 finding 的描述是否足够具体到可以编写验收标准"；"requirement 之间是否存在循环依赖"；"成功标准是否可自动化验证" |
| epistemic | "这个 requirement 的实施成本是否在预算内"（需估算）；"团队是否具备实施能力"（需评估）；"利益相关方是否会接受这个 requirement"（需沟通） |
| ontological | "这个 requirement 的长期维护成本分布"；"需求变更频率的分布"；"技术债累积到影响交付的时间分布" |

### 判定经验法则

- **能通过检查 finding 描述和上下文明确回答** → deterministic
- **答案存在但需要估算/评估/沟通才能确定** → epistemic
- **答案本质是概率分布，取决于未来不可控因素** → ontological

### 默认分布估计

规格化桥接场景：deterministic ~60% / epistemic ~30% / ontological ~10%

> 与其他 lens 显著不同：规格化阶段大部分问题是确定性的（能否转化、是否有依赖、是否可验证），不确定性主要来自实施层面。

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | spec-bridge-extract（从 findings[] 筛选+判定） | spec-bridge-extract | spec-bridge-extract |
| P2 校准 | 格式校验（PF/R/SC 结构完整性） | 可行性交叉评估（ce-brainstorm 预审） | 情景建模（多情境下的 requirement 稳定性） |
| P3 偏差 | feynman F1+F3（假设验证+过度精确化） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | 拆分测试（"这条 requirement 能否再拆？"） | 依赖追溯（"前置条件是否明确？"） | 鲁棒性测试（"需求变更后 requirement 是否仍有效？"） |
| P5 闭环 | 结构完整性检查 | 可行性确认 | 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 规格化桥接领域检查问题 |
|---|---------|----------------------|
| F1 | 未验证假设 | 这个 requirement 基于什么隐含假设？这些假设是否在 PF 或 SC 中被显式声明？ |
| F2 | 框架错配 | 我用什么粒度编写 requirement？这个粒度适合当前项目的实施节奏吗？（过粗无法执行，过细增加管理成本） |
| F3 | 过度精确化 | 我是否在给一个不确定的需求强加不合理的精确度？比如用具体数字描述尚未定义的功能？ |
| F4 | 附带伤害 | 如果把这个 finding 转化为 MUST requirement，会挤占哪些其他需求的资源？会让团队失去什么灵活性？ |
| F5 | 自证清白 | 我是在客观评估这条 finding 的规格化价值，还是在为自己的分析结论找落地方式？ |
| F6 | 真相漂移 | 经过转化，原始 finding 的含义是否被悄悄改变了？requirement 是否忠实反映了原始发现？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F6 同时 ❌ | 标记 `semantic_drift`，requirement 需重新对照原始 finding 校验 |
| F3 ❌ 且 uncertainty_type=ontological | 降级为 SHOULD 或 COULD，不允许作为 MUST |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| atomicity | 这条 requirement 是否是原子级的？能否独立验证？ |
| testability | 是否有明确的验收标准？标准是否可自动化？ |
| traceability | 能否追溯到原始 finding？映射关系是否清晰？ |
| priority | 优先级是否合理？与其他 requirement 是否冲突？ |
| dependency | 前置依赖是否明确？依赖链是否有环？ |
| scope_boundary | 是否在 PF 定义的范围内？超出部分是否需要单独处理？ |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 拆分测试 | "这条 requirement 能否拆分为更小的独立单元？" | evaluative, prescriptive | ce-brainstorm |
| D2 依赖追溯 | 追踪 requirement 的前置条件和下游消费者 | causal | ce-brainstorm |
| D3 边界探测 | 找边界情况：需求变更、资源缩减、时间压缩时 requirement 是否仍有效 | factual（边界型） | ce-brainstorm |
| D4 复现验证 | 用独立视角重新评估同一 finding 的规格化价值 | factual（核心型） | ce-doc-review |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| hegel_finding | 原始 hegel finding（含 confidence 历程和终态） | 高（0.85–0.95）— 规格化的唯一来源 |
| debono_value | debono 归真对冲发现的价值点 | 中高（0.6–0.8）— 被批判掩盖的真实价值 |
| scope_constraint | PF 中定义的约束和边界 | 高（0.8–0.9）— 规格化的框架 |
| stakeholder_input | 利益相关方的反馈或确认 | 中高（0.65–0.8）— 需标注来源 |
| precedent_requirement | 历史项目中类似的 requirement | 中（0.5–0.7）— 需注意情境差异 |

### 校准维度

| 维度 | 说明 |
|------|------|
| finding 终态 | confirmed > uncertain > dismissed（debono 恢复） |
| 可测试性 | 有明确 SC 的 requirement confidence 上调；无 SC 的下调 |
| 依赖完整性 | 依赖链完整且无环的 confidence 上调；有缺失的上报 spec_blocked |
| PF 对齐度 | 在 PF 范围内的 confidence 保持；超出范围的上报 scope_mismatch |
| 利益相关方确认 | 获得确认的 confidence 上调；未确认的标注 pending_approval |

---

## Rigor Probes 定制

相比默认五维探针，specification-bridge lens 的调整：

| 维度 | 调整 | 原因 |
|------|------|------|
| evidence | 阈值提高至 0.6（默认 0.5） | 规格化要求更高的证据确定性 |
| specificity | 权重提高至 0.30（默认 0.2） | requirement 必须具体到可执行、可验证 |
| counterfactual | 权重降低至 0.15（默认 0.2） | 规格化阶段重点是转化而非质疑 |
| attachment | 权重降低至 0.10（默认 0.2） | 转换 lens 个人偏见影响较小 |
| durability | 权重保持 0.2 | requirement 的时效性仍然重要 |

调整后总分仍归一化到 0-1，rigor_score ≥ 0.6 即 pass。

---

## 产出格式

S7 产出的 requirements doc 结构：

```markdown
# Requirements Specification: {target}

## Problem Frame
{一句话问题描述，从 hegel 报告的收敛摘要提取}

## Requirements

### R1. MUST {requirement 描述}
- **Source**: {finding_id} (confidence: {value}, status: {status})
- **Success Criteria**:
  - SC1.1: {可验证的验收标准}
  - SC1.2: {可验证的验收标准}
- **Dependencies**: {前置 requirement ID 或 "None"}
- **Priority**: P0/P1/P2

### R2. SHOULD {requirement 描述}
...

### R3. COULD {requirement 描述}
...

## Future Considerations
{dismissed 但有 debono 价值点的 finding，暂不规格化}

## Out of Scope
{超出 PF 范围的 finding，记录但不转化}
```

此格式可直接作为 ce-plan 的输入，满足 GENE:spec-gate 要求的「PF≥1句 + R≥3 + SC≥2」。
