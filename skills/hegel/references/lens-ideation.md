 
---
lens_id: ideation
version: 1.0.0
hard_cap: 4
compatible_with: "hegel-v2-design 2026-06-09"
---

# 创意收敛透镜（lens-ideation）

> 处理 osborn（太虚一转·散怀）产出的 idea-pool.md，将发散想法池转化为可收敛的断言集合。
> 补全太虚五转链路中「一转→二转」的结构性衔接。

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `idea_pool` |
| system_type_default | `non_deterministic` |
| trigger_condition | `config.lens == "ideation" \|\| target_type == "idea_pool" \|\| (target ends with "idea-pool.md")` |

### 快速路径

无。创意收敛必须经过完整 S2 claim-extract 管线——想法的来源标记（P1/P2a/P2b）是 rigor probe 的关键输入，不可跳过。

### 输入格式约定

期望输入为 osborn skill 产出的 `idea-pool.md`，包含：
- Frontmatter: `topic`, `total_ideas`, `dimensions`（可选，osborn V2.1+ 产出）
- 正文按 P1/P2a-S/C/A/M/P/E/R/P2b 分段
- 每条想法带来源标记 `[P1]` / `[P2a-S]` / `[P2b-用户]` 等

如果 `dimensions` 字段存在，hegel 可利用维度轴信息做维度级收敛优先级判断（优先收敛空白维度的想法）。

如果输入不符合此格式，执行者应在 S0 阶段提示用户先运行 osborn skill 或手动整理为 idea-pool 格式后再启动 hegel。此为文档级操作指引，init-state.py 不做自动格式校验。

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| feasibility | 这个想法在当前约束下可实现吗？ |
| novelty | 这个想法是否真正新颖，还是已知方案的变体？ |
| coherence | 这个想法与已有知识/其他想法是否自洽？ |
| value | 这个想法解决的是真问题还是伪问题？ |
| completeness | 这个想法是否足够具体到可以被验证或实施？ |
| risk | 实施这个想法会引入什么新风险？ |
| synergy | 这个想法与其他想法组合后是否产生涌现价值？ |

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 想法基于错误前提，继续推进会导致资源浪费 | confidence ≥ 0.6，否则降为 major |
| major | 想法有核心价值但存在关键缺口，需补充才能评估 | — |
| minor | 想法基本成立但有优化空间 | — |
| info | 有趣的观察或联想，暂无直接行动价值 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| 有具体案例/数据支撑的想法 | 0.50–0.70 | P2b 用户提供的真实经验 |
| 逻辑自洽但未经验证的想法 | 0.30–0.50 | P1 纯发散、P2a-SCAMPER 推演 |
| 模糊直觉或类比联想 | 0.15–0.30 | 早期 brainstorm 碎片 |

> ⚠️ 创意阶段的 confidence 普遍低于代码/投资领域，这是正常的。rigor gate 阈值应相应下调。

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 创意领域示例 |
|------------------|-------------|
| deterministic | "这个 API 是否存在"；"团队是否有能力实现 X"；"预算是否允许" |
| epistemic | "用户是否真的需要这个功能"（需调研）；"竞品是否已在做类似方案"（需搜索）；"技术方案的复杂度是否在可控范围"（需原型验证） |
| ontological | "这个产品方向的市场天花板"；"团队协作模式在规模扩大后的效果分布"；"用户对新交互模式的接受度分布" |

### 判定经验法则

- **能用 yes/no 回答且有明确验证手段** → deterministic
- **答案存在但需要收集更多信息才能确定** → epistemic
- **答案本质是概率分布，不同情境下结果不同** → ontological
- **想法本身还在定义阶段，连"要验证什么"都不清楚** → 先归为 epistemic，S5 深化时可能重分类为 ontological

### 默认分布估计

创意收敛场景：deterministic ~20% / epistemic ~55% / ontological ~25%

> 与代码审查（70/25/5）显著不同：创意阶段大部分断言处于"信息不足"状态。

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | claim-extract-ideation（解析来源标记+内容） | claim-extract-ideation | claim-extract-ideation |
| P2 校准 | bayes B1 硬验证（事实核查/API 查询） | bayes B2 双模型（可行性交叉评估） | bayes B2 概率分布（情景建模） |
| P3 偏差 | feynman F1+F5（假设验证+自证检查） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | deepen 删除测试（"删掉想法，问题还在吗？"） | deepen 删除+边界探测（组合验证） | deepen 情景分析（多情境鲁棒性） |
| P5 闭环 | feynman R2 | feynman R2 + 信息充分度检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 创意领域检查问题 |
|---|---------|-----------------|
| F1 | 未验证假设 | 这个想法基于什么隐含假设？这些假设是被验证过的，还是"大家都这么认为"？ |
| F2 | 框架错配 | 我用什么框架评估这个想法？这个框架适合当前阶段（发散 vs 收敛）和问题规模吗？ |
| F3 | 过度精确化 | 我是否在给一个模糊想法强加不合理的精确度？比如用具体数字描述尚未定义的概念？ |
| F4 | 附带伤害 | 如果推进这个想法，会挤占哪些其他想法的资源？会让团队陷入什么路径依赖？ |
| F5 | 自证清白 | 我是在客观评估这个想法的价值，还是在为自己提出的想法找理由？（尤其关注 [P2b-用户] 来源的想法） |
| F6 | 真相漂移 | 经过多轮讨论，这个想法是否从"一个可能性"悄悄变成了"我们应该做的事"？有没有跳过验证步骤？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |
| F5 ❌ 且来源为 [P2b-用户] | confidence -= 0.15，标记 `attachment_bias`（对自己提出的想法天然偏爱） |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| assumption | 想法的核心假设是什么？假设被推翻后想法是否还成立？ |
| evidence_gap | 验证这个想法需要什么信息？信息获取成本多高？ |
| alternative | 是否存在更简单的方案达到同样目的？ |
| combination | 这个想法与其他想法组合后是否更有价值？ |
| timing | 现在是推进这个想法的正确时机吗？ |
| stakeholder | 谁会受这个想法影响？他们的立场是什么？ |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "删掉这个想法，原始问题还在吗？有没有更好的解法？" | evaluative, prescriptive | deepen |
| D2 因果追溯 | 追踪"问题→想法→预期效果"的完整因果链，验证每个环节 | causal | deepen |
| D3 边界探测 | 找极端情况：资源减半、时间压缩、团队缩编时想法是否还成立 | factual（边界型） | deepen |
| D4 复现验证 | 用独立方法（搜索/访谈/原型）重新验证同一结论 | factual（核心型） | deep-research / prototype |

> 💡 创意场景中 D4 的使用频率远低于代码场景。大部分想法在 D1/D3 阶段就会被筛选，只有高价值且通过前两轮的想法才值得 D4 投入。

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| user_experience | 用户/团队成员的真实经验和案例 | 高（0.7–0.9）— 第一手观察 |
| external_data | 市场数据、竞品分析、行业报告 | 高（0.7–0.85）— 可交叉验证 |
| logical_reasoning | 逻辑推演、类比推理、思想实验 | 中（0.4–0.6）— 依赖推理质量 |
| precedent | 历史先例、类似项目的成败经验 | 中高（0.6–0.8）— 需注意情境差异 |
| intuition | 直觉判断、审美偏好、经验感觉 | 低（0.2–0.4）— 需标注为待验证 |
| source_tag | osborn 来源标记本身（P1/P2a/P2b） | 元数据（不作为独立证据，但影响 attachment 维度评分） |

### 校准维度

| 维度 | 说明 |
|------|------|
| 来源多样性 | 支持这个想法的证据来自几个独立来源？单一来源降权 |
| 来源标记 | [P2b-用户] 想法自动触发 F5 额外检查；[P1] 纯发散想法初始 confidence 上限 0.5 |
| 可验证性 | 这个想法能否在合理成本内被验证？不可验证的想法 confidence 上限 0.6 |
| 时效性 | 支撑想法的外部数据是否新鲜？超过 6 个月的数据降权 |
| 共识度 | 团队中有多少人独立得出类似结论？共识度高则 confidence 上调 |

---

## Rigor Probes 定制

相比默认五维探针，ideation lens 的调整：

| 维度 | 调整 | 原因 |
|------|------|------|
| evidence | 阈值降至 0.4（默认 0.5） | 创意阶段证据天然稀缺 |
| specificity | 阈值保持 0.5 | 想法可以模糊，但不能无法证伪 |
| counterfactual | 权重提高至 0.25（默认 0.2） | 发散阶段最缺反面思考 |
| attachment | 权重提高至 0.25（默认 0.2） | 对自己提出的想法天然偏爱 |
| durability | **禁用** | 创意阶段不谈时效，durability 由 timing 维度替代 |

调整后总分仍归一化到 0-1，rigor_score ≥ 0.5 即 pass（低于默认的 0.6）。
