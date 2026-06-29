---
lens_id: prd-review
version: 1.0.0
hard_cap: 5
compatible_with: "hegel-v2-design 2026-06-09"
---

# PRD 评审质量透镜（lens-prd-review）

> 向下验证：评审发现的问题真实存在吗？
> 向上补漏：评审遗漏了什么真实问题？
> 双向分析，让评审产出经得起推敲。

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `prd_review` |
| system_type_default | `mixed` |
| trigger_condition | `config.lens == "prd-review" \|\| target_type in ["prd_review"]` |

### 快速路径

无。PRD 评审质量分析必须经过完整 S2 claim-extract 管线——每个 finding 的准确性验证不可跳过。

### 双向分析模式

本 lens 同时执行两个方向的分析：

| 方向 | 问题 | 证据来源 |
|------|------|---------|
| 向下验证 | 评审发现的每个问题是否真实存在于 PRD 中？ | PRD 原文 + 知识库规范 |
| 向上补漏 | PRD 中存在但评审未发现的问题有哪些？ | PRD 原文 + 行业规范 + 状态机穷举 + 跨 PRD 一致性 |

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 | 方向 |
|----------|---------|------|
| finding_accuracy | 评审发现的问题是否真实存在于 PRD 原文？ | 向下验证 |
| severity_calibration | 严重度判定（🔴/🟡/⚪）是否合理？ | 向下验证 |
| scope_violation | 评审是否指责了 PRD 明确排除的内容？ | 向下验证 |
| false_negative | 评审是否遗漏了真实存在的问题？ | 向上补漏 |
| actionability | 修复建议是否具体可执行？ | 双向 |
| consistency | 报告内部逻辑（L1/L2/L3 三层）是否自洽？ | 双向 |

### finding_accuracy 与 false_negative 判定规则

当同一 PRD 段落同时触发两个分类时：

- **评审说了但说错了** → 主分类 `finding_accuracy`
- **PRD 有问题但评审没看到** → 主分类 `false_negative`
- 两者同时发生时，分别记录为独立 finding

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 评审结论根本性错误：将不存在的问题标为🔴、遗漏一票否决级问题、严重度整体倒置 | confidence ≥ 0.6，否则降为 major |
| major | 需要修正：严重度偏差 ≥2 级、遗漏🔴级问题、scope 越界导致误判 | — |
| minor | 值得关注：严重度偏差 1 级、修复建议模糊但不影响结论、次要 finding 遗漏 | — |
| info | 背景信息：改进方向建议、报告格式优化建议 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| PRD 原文直接证实/证伪 | 0.85–0.95 | 引用 PRD 具体段落，逐字对比 |
| 知识库规范交叉验证 | 0.65–0.85 | 团队规范/KM 知识确认评审判定 |
| 行业惯例推断 | 0.45–0.65 | 基于行业最佳实践的补漏判断 |
| 逻辑推理 | 0.30–0.50 | 状态机穷举、边界推导 |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | PRD 评审质量领域示例 |
|------------------|---------------------|
| deterministic | PRD 是否定义了某术语（有/无）；状态机是否包含某分支（有/无）；评审引用的 PRD 段落是否存在 |
| epistemic | 某 finding 的严重度是否合理（需要行业经验判断）；跨 PRD 一致性检查结论（需要读取关联 PRD） |
| ontological | 评审建议的业务方向是否正确（取决于未来业务演进）；竞品对标的适用性（取决于市场变化） |

### 判定经验法则

- **能对照 PRD 原文直接确认** → deterministic
- **需要行业经验或关联文档辅助判断** → epistemic
- **结论取决于未来业务/市场走向** → ontological

### 默认分布估计

PRD 评审质量分析：deterministic ~40% / epistemic ~45% / ontological ~15%

> 注：初始估计值，首次运行后根据实际数据校准。deterministic 比例高于投资场景（PRD 内容可验证），低于代码场景（代码可执行验证）。

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | 评审报告 finding 提取 + PRD 原文逐段对照 | 评审报告 finding 提取 + 知识库规范对照 | 评审报告 finding 提取 + 行业最佳实践对照 |
| P2 校准 | bayes B1 硬验证（PRD 原文直接核实） | bayes B2 双模型（评审判断 vs 独立判断交叉验证） | bayes B2 概率分布（多情景评估） |
| P3 偏差 | feynman F1（评审是否假设了 PRD 没写的需求？） | feynman F2+F5（评审框架是否适合？是否在证明自己聪明？） | feynman F2+F3（评审是否在非精确变量上追求精确？） |
| P4 深化 | PRD 原文逐字核验 + 状态机穷举 | 知识库/关联 PRD 检索 + 竞品对照 | deep-research 多源（行业趋势验证评审建议） |
| P5 闭环 | feynman R2 | feynman R2 + 区间检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | PRD 评审质量领域检查问题 |
|---|---------|------------------------|
| F1 | 未验证假设 | 这个 finding 基于什么假设？评审是否假设了 PRD 中未提及的需求或功能？引用的 PRD 段落是否真实存在且语义与评审理解一致？ |
| F2 | 框架错配 | 评审使用的质量框架（Checklist C1-C17）适合这个 PRD 的类型和复杂度吗？是否对简单功能 PRD 套用了重型架构评审标准？ |
| F3 | 过度精确化 | 评审是否在本质上模糊的业务决策点上追求确定性？例如：PRD 故意留白的设计空间被标为"缺失"？ |
| F4 | 附带伤害 | 如果按评审建议修改 PRD，会引入什么新的矛盾？跨 PRD 一致性会被破坏吗？修复成本是否远超问题本身的严重程度？ |
| F5 | 自证清白 | 评审是在帮 PRD 变得更好，还是在证明评审能力很强？发现的问题数量是否被作为质量指标而非问题本身的严重性？ |
| F6 | 真相漂移 | 经过多轮评审迭代，对同一 PRD 的评估是否从"基本合格"悄悄变成了"问题很多"？严重度判定标准是否在迭代中漂移？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |
| F2 ❌ 且 finding 数 >10 | 检查是否存在框架过重导致的系统性误判 |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| evidence_chain | 评审 finding 的证据链完整性：PRD 原文引用 → 知识库规范 → 严重度判定 |
| boundary_coverage | PRD 边界条件覆盖度：状态机穷举、异常路径、逆向流程 |
| cross_prd_alignment | 跨 PRD 一致性：本 PRD 与上下游域 PRD 的接口约定是否对齐 |
| scope_fidelity | Scope 忠实度：评审是否尊重了 PRD 声明的边界和排除项 |
| terminology_consistency | 术语一致性：评审使用的术语是否与 PRD 术语表和知识库一致 |
| pattern_completeness | 模式完备性：同类 PRD 常见的典型问题是否都被检查到 |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "删掉这个 finding，评审结论还站得住吗？" 评估 finding 对整体结论的影响 | evaluative, prescriptive | 内置分析 |
| D2 因果追溯 | 从 finding 追溯到 PRD 原文，验证证据链每个环节 | causal | PRD 原文读取 + 知识库检索 |
| D3 边界探测 | 对 PRD 做状态机穷举和边界条件枚举，寻找评审遗漏 | factual（边界型） | 内置分析 + knowledge base |
| D4 复现验证 | 独立于评审重新分析同一段 PRD，对比发现是否一致 | factual（核心型） | 独立分析 + deep-research |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| prd_text | PRD 原文直接引用（段落/表格/图片） | 高（0.85–0.95）— 第一手证据 |
| knowledge_base | 团队知识库/规范文档引用 | 中高（0.70–0.85）— 团队共识 |
| convention | 团队编码/设计/评审规范 | 中高（0.65–0.80）— 内部标准 |
| competitor | 竞品分析数据 | 中（0.50–0.70）— 二手，需验证方法论 |
| industry_standard | 行业标准/最佳实践 | 中（0.45–0.65）— 通用性强但适配性需判断 |
| logic | 逻辑推理/状态机穷举/边界分析 | 中低（0.40–0.60）— 依赖推理链完整性 |
| review_report | 评审报告自身的内部引用（L1/L2/L3 互引） | 中（0.50–0.70）— 自洽性检查 |

### 校准维度

| 维度 | 说明 |
|------|------|
| PRD 原文可追溯性 | finding 是否能直接对应到 PRD 具体段落？还是基于推断？ |
| 知识库时效性 | 引用的规范/知识是否过期？团队规范是否已更新？ |
| 评审版本差异 | 当前评审与历史版本的结论差异是否合理？差异是否有新证据支撑？ |
| PD 对焦影响 | PD 确认/豁免是否影响了 finding 的客观性？ |
| 跨 PRD 依赖完整性 | 评审是否充分检查了与关联 PRD 的一致性？关联 PRD 是否已获取？ |
| 严重度分布合理性 | 整体严重度分布是否符合该类 PRD 的经验分布？极端分布是否有合理解释？ |
