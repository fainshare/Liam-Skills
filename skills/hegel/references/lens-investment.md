---
lens_id: investment
version: 2.0.0
hard_cap: 6
compatible_with: "hegel-v2-design 2026-06-09"
---

# 投资透镜（lens-investment）

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `thesis` \| `fc` \| `position_review` \| `market_event` |
| system_type_default | `mixed` |
| trigger_condition | `config.lens == "investment" \|\| target_type in ["thesis", "fc", "position_review", "market_event"]` |

### 快速路径

无。投资分析必须经过完整 S2 claim-extract 管线（FC 因果链不可跳过提取步骤）。

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| thesis_integrity | FC 因果链站得住吗？ |
| evidence_quality | 在正确的事实上做决策吗？ |
| valuation_gap | 市场定价遗漏了什么？ |
| management_governance | 管理层值得信任吗？ |
| position_sizing | 资金分配与认知匹配吗？ |
| market_structure | 游戏规则有什么隐患？ |
| catalyst_timing | 时间站在我们这边还是对面？ |

### thesis_integrity 与 evidence_quality 判定规则

当缺陷跨越两个分类时，以根因层级判定主分类：

- **数据/事实层面错误**（数据源有误、数据过期、引用错误）→ 主分类 `evidence_quality`
- **推理逻辑层面错误**（因果关系不成立、遗漏关键变量、推理跳跃）→ 主分类 `thesis_integrity`
- 根因同时涉及两者时，以更上游的错误为主分类（数据错误比逻辑错误更上游）

### 跨维度耦合

- 每个 finding 有且仅有一个 `category`（主分类）
- 可选 `secondary_categories[]` 记录波及的其他维度
- severity ≥ high 且 secondary_categories 非空时，报告中注明跨维度影响链

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 论点根基动摇：FC 核心因果链断裂、关键数据造假/严重失实、合规红线触发 | confidence ≥ 0.6，否则降为 major |
| major | 需要行动：估值假设偏差 >30%、管理层可信度显著下降、仓位配置违反三层约束 | — |
| minor | 值得关注：次要证据过期、催化剂时间表轻微推迟、非核心维度轻微偏移 | — |
| info | 背景信息：行业趋势观察、可选对标数据、潜在改进方向 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| 一手定量数据直接证实 | 0.80–0.95 | 财报数据、监管文件、交易所公告 |
| 多源交叉验证的定性判断 | 0.60–0.80 | 多家机构一致结论、管理层多次言行一致 |
| 单源定性判断 | 0.40–0.60 | 单一分析师观点、单次管理层表态 |
| 推断或类比 | 0.25–0.45 | 行业类比、历史模式外推 |

### severity 修正器

| 修正器 | 规则 |
|--------|------|
| tier_modifier | `survival_base` 层标的 severity 自动 +1 级（底仓安全攸关） |
| position_weight_modifier | 持仓占比 >10% severity 自动 +1 级（集中度风险） |
| cadence_proximity_modifier | 距月度决策 <7 天标记 `urgency=urgent`（不改 severity，标记时间敏感性） |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 投资领域示例 |
|------------------|-------------|
| deterministic | 8-K 是否提及 AZ deal；FY2025 收入是否 >12 亿；stock split 比例是几比几 |
| epistemic | SKB264 能否 2027 获批（理论有答案但需临床数据）；管理层是否在减持（需交易所数据确认） |
| ontological | 焦煤 ASP 明年走势；中美关税最终税率；创新药 take rate 3 年后的水平 |

### 判定经验法则

- **能查文件/公告确认** → deterministic
- **理论上有答案但需补充数据或等待事件** → epistemic
- **结果取决于多方博弈/宏观不可控因素** → ontological

### 默认分布估计

投资分析场景：deterministic ~20% / epistemic ~45% / ontological ~35%

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | thesis-fact-audit R2（事实核验） | thesis-fact-audit R2 | thesis-fact-audit R2 |
| P2 校准 | bayes B1 硬验证（查文件/公告） | bayes B2 双模型（互竞假设加权） | bayes B2 概率分布（分布估计） |
| P3 偏差 | feynman F1（假设验证） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | thesis-fact-audit R4（深度验证） | deep-research 多源（扩展证据面） | thesis-fact-audit R5 压力测试（情景分析） |
| P5 闭环 | feynman R2 | feynman R2 + 区间检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 投资领域检查问题 |
|---|---------|-----------------|
| F1 | 未验证假设 | 这个 finding 基于什么假设？FC 因果链中的关键前提是否有一手数据支撑，还是引用了其他分析师的二手结论？ |
| F2 | 框架错配 | 我用的估值框架（DCF/相对估值/赔率思维）适合这个标的的阶段和行业吗？成长股用 PE、周期股用 PB 是否自动套用了不匹配的模型？ |
| F3 | 过度精确化 | 我是否在本质随机的变量上追求精确数值？催化剂日期精确到月 vs 季度是否有意义？ |
| F4 | 附带伤害 | 如果按这个 finding 调仓，会对三层架构平衡产生什么连锁影响？是否触发集中度约束？ |
| F5 | 自证清白 | 我是在找证据证明该减仓/加仓，还是在客观评估 FC 有效性？持仓偏见（不愿承认错误）是否在影响判断？ |
| F6 | 真相漂移 | 经过多轮分析，我对这个标的的看法是否从"值得关注的风险"悄悄变成了"必须行动的问题"？确信度变化是否有新证据支撑？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| thesis_strength | FC 因果链完整性、关键假设的证据支撑深度 |
| evidence_freshness | 核心证据的时效性、数据源覆盖面、交叉验证程度 |
| valuation_methodology | 估值方法适配度、关键参数敏感性、同业对标合理性 |
| management_track_record | 管理层承诺兑现率、资本配置历史、治理结构风险 |
| position_risk | 仓位集中度、流动性风险、三层架构合规性 |
| market_dynamics | 市场结构变化、监管政策影响、流动性环境 |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "删掉这个假设，论点还站得住吗？" FC 因果链单环路删除后论点鲁棒性测试 | evaluative, prescriptive | deepen |
| D2 因果追溯 | 追踪 FC 完整因果链，验证每个环节是否有一手证据支撑 | causal | deepen / thesis-fact-audit R4 |
| D3 边界探测 | 找极端情景：最悲观假设下标的是否仍满足底线？催化剂永远不到怎么办？ | factual（边界型） | thesis-fact-audit R5 压力测试 |
| D4 复现验证 | 用独立数据源或替代估值方法重新验证同一结论 | factual（核心型） | thesis-fact-audit R2 + deep-research |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| financial_data | 财报数据、营收/利润/现金流（一手定量） | 高（0.85–0.95）— 审计后数据 |
| regulatory_filing | 监管文件、交易所公告、8-K/6-K | 高（0.80–0.95）— 法定披露 |
| management_action | 管理层行为（增减持、回购、并购、薪酬变动） | 中高（0.70–0.85）— 行为胜于言辞 |
| market_data | 股价/成交量/期权数据/资金流 | 中（0.50–0.70）— 反映预期非基本面 |
| industry_research | 行业报告、第三方调研、专家访谈 | 中（0.50–0.70）— 二手，需验证方法论 |
| analyst_opinion | 分析师报告、评级变动、目标价 | 低（0.30–0.50）— 有利益冲突风险 |
| logic | 逻辑推理/类比/第一性原理推导 | 中低（0.40–0.60）— 依赖推理链质量 |

### 校准维度

| 维度 | 说明 |
|------|------|
| 数据时效 | 证据的时间戳距今多久？>6 个月的财务数据权重衰减 |
| 源独立性 | 多个证据是否来自独立数据源？还是都引用同一份报告？ |
| 利益冲突 | 信息提供者是否有利益偏向？（如：卖方推荐自承销标的） |
| 可验证性 | 结论是否可通过公开数据交叉验证？ |
| 预测记录 | 信息源的历史预测准确率如何？ |
