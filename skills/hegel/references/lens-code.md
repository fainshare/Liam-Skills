---
lens_id: code
version: 2.0.0
hard_cap: 4
compatible_with: "hegel-v2-design 2026-06-09"
---

# 代码透镜（lens-code）

---

## §1 适用场景（applicability）

| 字段 | 值 |
|------|-----|
| target_type | `file` \| `diff` \| `pr` \| `module` \| `code_change` |
| system_type_default | `deterministic` |
| trigger_condition | `config.lens == "code" \|\| target_type in ["file", "diff", "pr", "module", "code_change"]` |

### 快速路径

当 `config.lens == "code" && target_type in ["file", "diff", "pr"]` 时启用：

- S1 scope 从模板自动填充（auto_fill_ratio ≈ 1.0，V8 告警豁免）
- S2 跳过 claim-extract，调用 code-review-skill 直接产出 findings[]
- findings[].origin = `structural_discovery`，claims[] 为空
- S3 仅补充 uncertainty_type 判定

---

## §2 发现分类（categories）

### 分类枚举

| category | 核心问题 |
|----------|---------|
| logic_bug | 代码逻辑是否正确？ |
| security | 是否存在安全漏洞？ |
| architecture | 架构设计是否合理？ |
| performance | 是否存在性能瓶颈？ |
| correctness | 实现是否符合预期行为？ |
| design | 设计模式/接口是否恰当？ |
| maintainability | 代码是否易于维护和理解？ |

### severity 判定规则

| severity | 标准 | confidence 约束 |
|----------|------|----------------|
| critical | 阻塞发布：数据丢失、安全漏洞、崩溃、死锁 | confidence ≥ 0.6，否则降为 major |
| major | 必须修复：逻辑错误、边界未处理、接口设计缺陷 | — |
| minor | 建议修复：冗余逻辑、命名不清、轻微性能浪费 | — |
| info | 信息性：风格偏好、文档补充、潜在改进方向 | — |

> **confidence-severity 耦合规则**：confidence < 0.6 的 finding 不得获得 critical 标签。effective_severity = raw_severity 按 confidence 降级（conf < 0.6 → critical 降至 major；conf < 0.4 → critical 降至 minor）。

### 初始置信度指南

| 证据强度 | confidence 范围 | 典型场景 |
|---------|----------------|---------|
| 代码直接可见的错误 | 0.80–0.95 | 空指针、越界、SQL 注入 |
| 逻辑推断的问题 | 0.50–0.70 | 并发竞态、状态泄漏 |
| 风格/偏好类建议 | 0.30–0.50 | 命名规范、注释风格 |

---

## §3 不确定性判定指南

### 三类型示例

| uncertainty_type | 代码领域示例 |
|------------------|-------------|
| deterministic | 函数返回 null 时调用方是否 NPE；SQL 是否有注入；正则是否匹配预期格式 |
| epistemic | 并发设计是否可能死锁（取决于调度序列）；缓存一致性在高并发下是否安全（需压测数据） |
| ontological | P99 延迟分布；GC 暂停时长分布；高负载下的吞吐衰减曲线 |

### 判定经验法则

- **能写确定性测试验证** → deterministic
- **理论上有答案但需要更多信息或特定条件才能验证** → epistemic
- **结果本质是概率分布，不同运行得到不同值** → ontological

### 默认分布估计

代码审查场景：deterministic ~70% / epistemic ~25% / ontological ~5%

---

## §4 Skill 路由矩阵

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | code-review-skill（直出 findings） | code-review-skill | code-review-skill |
| P2 校准 | bayes B1 硬验证（代码复现） | bayes B2 双模型（设计评估） | bayes B2 概率分布（性能分布） |
| P3 偏差 | feynman F1（假设验证） | feynman F2+F5（框架+自证） | feynman F2+F3（框架+过度精确化） |
| P4 深化 | deepen 根因追溯（单因果链→复现→确认） | deepen 证据扩展（多维补数据→窄化） | deepen 情景分析+鲁棒性测试 |
| P5 闭环 | feynman R2 | feynman R2 + 区间检查 | feynman R2 + 稳定性检查 |

---

## §5 偏差检查问题

| # | 偏差类型 | 代码领域检查问题 |
|---|---------|-----------------|
| F1 | 未验证假设 | 这个 finding 基于什么假设？假设是否在测试或代码中被显式验证过？ |
| F2 | 框架错配 | 我用的分析框架（设计模式/架构原则）适合这个问题的规模和约束吗？ |
| F3 | 过度精确化 | 这个 finding 是否把简单问题过度解读了？修复成本是否远超实际风险？ |
| F4 | 附带伤害 | 如果按这个 finding 修改，会打破哪些现有行为或引入什么新的耦合？ |
| F5 | 自证清白 | 我是在找证据证明它有问题，还是在客观评估代码意图和实际行为？ |
| F6 | 真相漂移 | 经过多轮分析，我对这个问题的理解是否从"可能的 bug"悄悄变成了"确定的缺陷"？ |

### penalty_rules

| 条件 | 惩罚 |
|------|------|
| F1 + F5 同时 ❌ | confidence -= 0.2，status 回退为 uncertain |

---

## §6 深化维度

### dimension 枚举

| dimension | 检查内容 |
|-----------|---------|
| coupling | 问题是否源于模块间过度耦合？ |
| cohesion | 相关逻辑是否应在同一模块？ |
| extensibility | 当前设计能否支撑已知的未来变化？ |
| boundary | 模块职责边界是否清晰？ |
| dependency | 依赖方向是否合理？有无循环依赖？ |
| abstraction | 抽象层级是否恰当？有无泄漏或过度封装？ |

### D1-D4 路由表

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 删除测试 | "删掉这个假设，代码还能正常运行吗？" | evaluative, prescriptive | deepen |
| D2 因果追溯 | 追踪完整调用链/数据流，验证每个环节 | causal | deepen / diagnose |
| D3 边界探测 | 找边界条件：空集合、最大值、并发、超时 | factual（边界型） | deepen |
| D4 复现验证 | 用独立测试用例或替代方法重新验证同一结论 | factual（核心型） | deepen |

---

## §7 证据类型与校准维度

### evidence_type 枚举

| type | 说明 | 权重指南 |
|------|------|---------|
| code | 代码片段直接引用（file:line） | 高（0.8–1.0）— 第一手证据 |
| doc | 文档/注释/README 引用 | 中（0.5–0.7）— 可能过期 |
| convention | 项目约定/编码规范引用 | 中（0.5–0.7）— 团队共识 |
| logic | 逻辑推理/反证 | 中低（0.4–0.6）— 依赖推理链质量 |
| empirical | 测试结果/运行日志/性能数据 | 高（0.8–0.95）— 可复现 |

### 校准维度

| 维度 | 说明 |
|------|------|
| 测试覆盖 | 相关代码是否有测试？测试是否覆盖了 finding 涉及的路径？ |
| 历史变更 | git log 显示该区域是否频繁变更？是否有相关 bug fix？ |
| 依赖影响面 | 变更影响范围有多大？下游消费者有多少？ |
| 复现难度 | 问题是否可稳定复现？还是依赖特定条件/时序？ |
