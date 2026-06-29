---
lens_id: architecture-decision
version: 1.0.0
hard_cap: 5
compatible_with: "hegel-v2-design 2026-06-09"
---

# 架构决策透镜（lens-architecture-decision）

> 分析架构决策记录（ADR）、设计论述、技术方案选型等非代码态的结构化论证。
> 支持对话态论述的 S0 前置固化，将非结构化输入转化为 hegel 可消费的 target_text。

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `adr` \| `architecture_discussion` \| `design_rationale` \| `tech_proposal` |
| system_type_default | `mixed` |
| trigger_condition | `config.lens == "architecture-decision" \|\| target_type in ["adr", "architecture_discussion", "design_rationale", "tech_proposal"]` |

### 快速路径

无。架构决策分析必须经过完整 S2 claim-extract 管线——决策的 Rationale/Alternatives/Trade-offs 结构是 rigor probe 的关键输入。

### S0 前置固化

当输入不是文件路径（如对话中的论述片段）时，执行者应在 S0 阶段将其固化为 ADR 格式文档后再启动管线。固化模板：

```markdown
# Architecture Decision: {标题}

## Context
{背景约束、问题描述}

## Decision
{核心主张，一句话}

## Rationale
- {论点1}
- {论点2}

## Alternatives Considered
- {备选方案A}: {拒绝原因}
- {备选方案B}: {拒绝原因}

## Trade-offs
- {代价1}
- {代价2}

## Evidence / Precedents
- {历史案例/数据支撑}

## Open Questions
- {未决问题1}（如有）
```

如果输入已是文件且符合 ADR 或类似结构，跳过固化直接进入 S1。此为文档级操作指引，init-state.py 不做自动格式校验。

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| assumption_validity | 决策基于的假设是否成立？ |
| alternative_coverage | 是否充分考虑了备选方案？ |
| tradeoff_awareness | 代价是否被识别且可接受？ |
| evidence_strength | 支撑决策的证据是否充分？ |
| scope_alignment | 决策是否与问题范围匹配？ |
| reversibility | 决策是否可逆？回退成本多高？ |
| temporal_robustness | 决策在时间维度上是否稳健？ |

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 决策基于错误前提或遗漏关键备选方案，继续执行会导致系统性风险 | confidence ≥ 0.6，否则降为 major |
| major | 决策有核心价值但证据不足或 trade-off 未被充分评估 | — |
| minor | 决策基本成立但有优化空间或文档不完整 | — |
| info | 有趣的观察或补充信息，不影响决策有效性 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| 有多源数据/先例支撑的决策 | 0.60–0.80 | 有 benchmark、POC、行业案例 |
| 逻辑自洽但缺乏实证的决策 | 0.40–0.60 | 纯推理、类比论证 |
| 基于直觉或经验的决策 | 0.25–0.45 | "我觉得这样更好"、团队共识但无数据 |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 架构决策领域示例 |
|------------------|-----------------|
| deterministic | "这个 API 是否有速率限制"；"团队是否具备 Kubernetes 运维能力"；"许可证是否允许商用" |
| epistemic | "微服务拆分后运维复杂度是否可控"（需试点验证）；"新框架的学习曲线是否在可接受范围"（需团队评估）；"供应商的长期支持力度"（需调研） |
| ontological | "系统在 3 年后的流量分布"；"团队规模扩大后的协作效率分布"；"技术债累积到临界点的时间分布" |

### 判定经验法则

- **能通过查阅文档/API/合同明确回答** → deterministic
- **答案存在但需要试点/调研/评估才能确定** → epistemic
- **答案本质是概率分布，取决于未来不可控因素** → ontological
- **决策本身还在讨论阶段，连"要验证什么"都不清楚** → 先归为 epistemic，S5 深化时可能重分类

### 默认分布估计

架构决策场景：deterministic ~30% / epistemic ~45% / ontological ~25%

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | claim-extract-architecture-decision（解析 ADR 结构） | claim-extract-architecture-decision | claim-extract-architecture-decision |
| P2 校准 | bayes B1 硬验证（文档/API/合同核查） | bayes B2 双模型（可行性交叉评估） | bayes B2 概率分布（情景建模） |
| P3 偏差 | feynman F1+F5（假设验证+自证检查） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | deepen 删除测试（"去掉这个假设，决策还成立吗？"） | deepen 边界探测（极端情境压力测试） | deepen 情景分析（多情境鲁棒性） |
| P5 闭环 | feynman R2 | feynman R2 + 信息充分度检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 架构决策领域检查问题 |
|---|---------|---------------------|
| F1 | 未验证假设 | 这个决策基于什么隐含假设？这些假设是被验证过的，还是"业界都这么做"？ |
| F2 | 框架错配 | 我用什么框架评估这个决策？这个框架适合当前问题的规模和约束吗？（如用企业级框架评估小团队项目） |
| F3 | 过度精确化 | 我是否在给一个不确定的未来强加不合理的精确度？比如用具体数字预测 3 年后的流量？ |
| F4 | 附带伤害 | 如果执行这个决策，会锁定什么技术路径？会让团队失去什么灵活性？ |
| F5 | 自证清白 | 我是在客观评估这个决策，还是在为自己倾向的方案找理由？（尤其关注自己提出的方案） |
| F6 | 真相漂移 | 经过多轮讨论，这个决策是否从"一个可选方案"悄悄变成了"唯一正确方案"？有没有跳过对备选方案的公平评估？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |
| F6 ❌ 且 Alternatives Considered 为空 | confidence -= 0.25，标记 `alternative_blindness`（未考虑备选方案是架构决策的致命缺陷） |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| assumption | 决策的核心假设是什么？假设被推翻后决策是否还成立？ |
| alternative | 是否存在被忽略的备选方案？为什么被排除？排除理由是否充分？ |
| reversibility | 决策是否可逆？回退成本多高？是否有退出策略？ |
| dependency | 决策引入了什么外部依赖？依赖方的稳定性如何？ |
| scale | 决策在当前规模下合理，在 10x 规模下是否仍然合理？ |
| timing | 现在是做这个决策的正确时机吗？过早或过晚的风险是什么？ |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "去掉这个假设/约束，决策还成立吗？有没有更简单的方案？" | evaluative, prescriptive | deepen |
| D2 因果追溯 | 追踪"问题→决策→预期效果"的完整因果链，验证每个环节 | causal | deepen |
| D3 边界探测 | 找极端情况：流量 10x、团队缩编、供应商倒闭时决策是否还成立 | factual（边界型） | deepen |
| D4 复现验证 | 用独立方法（POC/benchmark/第三方评估）重新验证同一结论 | factual（核心型） | deep-research / prototype |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| benchmark | 性能测试/benchmark 数据 | 高（0.8–0.95）— 可复现 |
| precedent | 行业先例、类似项目的成败经验 | 中高（0.6–0.8）— 需注意情境差异 |
| poc | 概念验证/原型测试结果 | 高（0.75–0.9）— 第一手验证 |
| documentation | 官方文档/API 规范/合同条款 | 中高（0.65–0.85）— 可能过期 |
| expert_opinion | 专家意见/团队共识 | 中（0.5–0.7）— 需标注来源 |
| logical_reasoning | 逻辑推演、类比推理 | 中低（0.4–0.6）— 依赖推理链质量 |
| intuition | 直觉判断、经验感觉 | 低（0.2–0.4）— 需标注为待验证 |

### 校准维度

| 维度 | 说明 |
|------|------|
| 证据多样性 | 支撑决策的证据来自几个独立来源？单一来源降权 |
| 备选方案覆盖 | Alternatives Considered 是否 ≥2 个？每个是否有明确的拒绝理由？ |
| 可逆性 | 决策是否可逆？不可逆决策需要更强的证据支撑 |
| 时效性 | 支撑决策的外部数据/文档是否新鲜？技术类文档超过 12 个月降权 |
| 利益相关方对齐 | 决策是否获得了关键利益相关方的认可？未对齐的决策 confidence 上限 0.6 |

---

## Rigor Probes 定制

相比默认五维探针，architecture-decision lens 的调整：

| 维度 | 调整 | 原因 |
|------|------|------|
| evidence | 阈值保持 0.5 | 架构决策应有基本证据支撑 |
| specificity | 权重提高至 0.25（默认 0.2） | 架构决策最怕模糊，必须具体到可执行 |
| counterfactual | 权重提高至 0.25（默认 0.2） | 备选方案思考是架构决策的核心纪律 |
| attachment | 权重保持 0.2 | 对自己提出的方案天然偏爱 |
| durability | 权重降低至 0.1（默认 0.2） | 架构决策的时效性由 §6 timing 维度替代 |

调整后总分仍归一化到 0-1，rigor_score ≥ 0.55 即 pass。
