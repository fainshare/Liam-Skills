---
lens_id: retrospective
version: 1.0.0
hard_cap: 4
compatible_with: "hegel-v2-design 2026-06-09"
---

# 复盘收敛透镜（lens-retrospective）

> 处理 hegel 自身产出的收敛报告或 retro skill 的复盘文档，将分析成果转化为可沉淀的经验断言。
> 补全太虚五转链路中「二转→复盘→沉淀」的出口衔接。

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `hegel_report` \| `convergence_analysis` \| `retro_document` |
| system_type_default | `mixed` |
| trigger_condition | `config.lens == "retrospective" \|\| target_type in ["hegel_report", "convergence_analysis", "retro_document"] \|\| (target matches "hegel-*.md" or "retro-*.md")` |

### 快速路径

无。复盘收敛必须经过完整 S2 claim-extract 管线——需要从 findings[] 中区分"已确认但未解决"和"被排除但有价值"两类断言，不可跳过。

### 输入格式约定

期望输入为以下两种格式之一：

1. **hegel 收敛报告**：`docs/hegel-reports/{target_slug}-hegel-{date}.md`，包含收敛摘要、确认的问题、已排除的问题、未收敛的问题等 section
2. **retro 复盘文档**：retro skill 产出的四象限复盘文档，包含 What Went Well / What Didn't / Action Items / Insights 等 section

如果输入不符合上述格式，执行者应在 S0 阶段提示用户确认输入来源。此为文档级操作指引，init-state.py 不做自动格式校验。

### 自动触发 debono

当使用此 lens 时，S7 §11.2 的 debono 归真对冲检查**自动触发**，无需手动传 `--debono` 参数。原因：复盘场景天然需要防止"批判致死"，被排除的发现中可能包含被忽视的价值点。

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| confirmed_insight | 已确认的发现是否值得沉淀为团队知识？ |
| dismissed_value | 被排除的发现中是否有被过度批判的真实价值？ |
| unresolved_risk | 未收敛的发现是否构成持续风险？ |
| action_gap | 是否有发现缺少对应的行动项？ |
| pattern_recognition | 多个发现是否指向同一个系统性模式？ |
| process_improvement | 分析过程本身是否有改进空间？ |
| knowledge_gap | 是否存在反复出现的信息缺口？ |

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 已确认的高风险发现缺少行动项，或未收敛发现构成系统性威胁 | confidence ≥ 0.6，否则降为 major |
| major | 被排除的发现中有真实价值被忽视，或存在明显的知识缺口 | — |
| minor | 有优化空间但不影响核心结论 | — |
| info | 有趣的观察或补充信息 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| hegel 报告中 status=confirmed 且 confidence≥0.85 的发现 | 0.75–0.90 | 经过完整收敛验证的结论 |
| hegel 报告中 status=uncertain 的发现 | 0.40–0.60 | 未完全收敛但有一定支撑 |
| retro 文档中的主观反思 | 0.30–0.50 | 团队感受、直觉判断 |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 复盘领域示例 |
|------------------|-------------|
| deterministic | "这个 bug 是否在最新版本中修复"；"行动项是否有明确的负责人和截止日期"；"知识库中是否已有相关文档" |
| epistemic | "这个模式是否在其他项目中也存在"（需跨项目调研）；"团队的改进建议是否可行"（需资源评估）；"被排除的方案在新条件下是否重新有价值"（需情境分析） |
| ontological | "类似问题的复发概率"；"团队学习曲线的分布"；"流程改进的长期效果分布" |

### 判定经验法则

- **能通过查阅报告/台账/知识库明确回答** → deterministic
- **答案存在但需要跨项目调研或资源评估才能确定** → epistemic
- **答案本质是概率分布，取决于未来不可控因素** → ontological

### 默认分布估计

复盘收敛场景：deterministic ~35% / epistemic ~40% / ontological ~25%

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | claim-extract-retrospective（解析报告结构+findings 状态） | claim-extract-retrospective | claim-extract-retrospective |
| P2 校准 | bayes B1 硬验证（查阅原始报告/台账） | bayes B2 双模型（跨项目交叉验证） | bayes B2 概率分布（历史数据建模） |
| P3 偏差 | feynman F1+F5（假设验证+自证检查） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | deepen 删除测试（"去掉这个发现，复盘结论还成立吗？"） | deepen 边界探测（其他项目/时间段是否同样适用） | deepen 情景分析（多情境鲁棒性） |
| P5 闭环 | feynman R2 | feynman R2 + 信息充分度检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 复盘领域检查问题 |
|---|---------|-----------------|
| F1 | 未验证假设 | 这个复盘结论基于什么假设？这些假设是被验证过的，还是"事后诸葛亮"？ |
| F2 | 框架错配 | 我用什么框架做复盘？这个框架适合当前问题的性质吗？（如用技术复盘框架分析人际问题） |
| F3 | 过度精确化 | 我是否在给一个模糊的经验教训强加不合理的精确度？比如把个案总结为普适规律？ |
| F4 | 附带伤害 | 如果把这个发现沉淀为团队规范，会限制什么灵活性？会让团队忽略什么例外情况？ |
| F5 | 自证清白 | 我是在客观评估这个发现的价值，还是在为自己的分析结论找理由？ |
| F6 | 真相漂移 | 经过多轮复盘，这个发现是否从"一个可能的改进点"悄悄变成了"必须执行的规范"？有没有跳过验证步骤？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |
| F3 ❌ 且样本量 < 3 | confidence -= 0.15，标记 `small_sample_generalization`（小样本泛化风险） |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| generalizability | 这个发现在其他项目/团队/时间段是否同样适用？ |
| actionability | 这个发现是否能转化为具体可执行的行动项？ |
| root_cause | 这个发现是表面现象还是根因？是否需要再挖一层？ |
| recurrence | 类似问题历史上出现过几次？是否有系统性模式？ |
| cost_benefit | 实施改进的成本与预期收益是否匹配？ |
| knowledge_artifact | 这个发现应该沉淀为什么形式的知识资产？（文档/规范/工具/培训） |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "去掉这个发现，复盘的核心结论还成立吗？" | evaluative, prescriptive | deepen |
| D2 因果追溯 | 追踪"现象→根因→改进"的完整因果链 | causal | deepen |
| D3 边界探测 | 找边界情况：其他项目、不同团队规模、不同技术栈时是否同样适用 | factual（边界型） | deepen |
| D4 复现验证 | 用独立方法（跨项目调研、历史数据分析）重新验证同一结论 | factual（核心型） | deep-research |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| hegel_finding | hegel 收敛报告中的 finding（含 confidence 历程） | 高（0.8–0.95）— 经过完整收敛验证 |
| retro_observation | retro 文档中的观察/反思 | 中（0.5–0.7）— 主观但有团队共识 |
| historical_data | 历史项目数据、git log、incident 记录 | 高（0.75–0.9）— 可追溯 |
| cross_project | 其他项目的类似案例 | 中高（0.6–0.8）— 需注意情境差异 |
| team_consensus | 团队讨论达成的共识 | 中（0.5–0.7）— 需标注参与人数 |
| logical_reasoning | 逻辑推演、类比推理 | 中低（0.4–0.6）— 依赖推理链质量 |

### 校准维度

| 维度 | 说明 |
|------|------|
| 收敛状态 | 原始 finding 的终态是什么？confirmed > uncertain > dismissed |
| 样本量 | 支撑这个发现的案例数量？单案例降权，≥3 案例上调 |
| 跨项目验证 | 是否在其他项目中观察到类似模式？有则上调 |
| 时效性 | 原始发现的时间距今多久？超过 6 个月的复盘发现降权 |
| 行动项关联 | 是否有对应的行动项？有行动项的发现 confidence 上调 |

---

## Rigor Probes 定制

相比默认五维探针，retrospective lens 的调整：

| 维度 | 调整 | 原因 |
|------|------|------|
| evidence | 阈值保持 0.5 | 复盘发现应有基本证据支撑 |
| specificity | 权重提高至 0.25（默认 0.2） | 经验教训必须具体到可执行，避免空泛总结 |
| counterfactual | 权重保持 0.2 | 复盘需要考虑反面案例 |
| attachment | 权重降低至 0.15（默认 0.2） | 复盘是集体行为，个人偏见影响较小 |
| durability | 权重提高至 0.25（默认 0.2） | 经验教训的时效性至关重要，过时的教训比没有更危险 |

调整后总分仍归一化到 0-1，rigor_score ≥ 0.55 即 pass。
