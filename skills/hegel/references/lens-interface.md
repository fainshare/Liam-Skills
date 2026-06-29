# 透镜接口规范

> 每个 `references/lens-{name}.md` 必须实现以下 7 个 section。
> S0 lens-validate 逐项校验，缺 section 则阻塞管线。

---

## 元数据（YAML frontmatter）

```yaml
---
lens_id: string          # 唯一标识（"code" | "investment" | ...）
version: string          # 语义化版本号
hard_cap: integer        # 安全阀上限（§8.6 同步），V7 校验引用此值
compatible_with: string  # 兼容的设计文档版本
---
```

---

## §1 适用场景（applicability）

必须包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| target_type | enum[] | 此 lens 支持的分析目标类型（如 `file`, `thesis`） |
| system_type_default | enum | 默认 system_type（`deterministic` / `non_deterministic` / `mixed`） |
| trigger_condition | string | 自动选择此 lens 的条件表达式（S0 匹配用） |
| fast_path | object \| null | 快速路径配置（见设计文档 §3.3），null = 无快速路径 |

---

## §2 发现分类（categories）

必须包含：

| 字段 | 说明 |
|------|------|
| category 枚举表 | `finding.category` 所有合法值 + 每类的核心问题描述 |
| severity 判定规则 | 每个 category 的 critical / major / minor / info 判定标准；critical 行必须包含 confidence 约束（如 confidence ≥ 0.6，否则降为 major）；所有 lens 统一：confidence < 0.6 → critical 不得授予 |
| 初始置信度指南 | 证据强度到初始 confidence 的映射 |
| severity 修正器（可选） | 上下文修正器列表（如投资 lens 的 tier/position/cadence 修正） |
| 分类边界规则（可选） | 跨分类归属时的判定规则 |

---

## §3 不确定性判定指南

必须包含：

| 内容 | 说明 |
|------|------|
| 三类型示例表 | deterministic / epistemic / ontological 在该领域的具体例子（≥2 例/类型） |
| 判定经验法则 | 边界情况的快速判定技巧 |
| 默认分布估计 | 该领域典型的三类型比例（辅助 S3 校准） |

---

## §4 Skill 路由矩阵

P1-P5 × uncertainty_type 映射表，每格指定 `skill name + mode`：

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P1 发现 | skill + mode | skill + mode | skill + mode |
| P2 校准 | ... | ... | ... |
| P3 偏差 | ... | ... | ... |
| P4 深化 | ... | ... | ... |
| P5 闭环 | ... | ... | ... |

---

## §5 偏差检查问题

F1-F6 的领域特异版本，每条含：

| # | 偏差类型 | 通用名 | 领域特异检查问题 |
|---|---------|--------|-----------------|
| F1 | 未验证假设 | untested_assumption | 领域特定提问 |
| F2 | 框架错配 | wrong_framework | ... |
| F3 | 过度精确化 | over_precision | ... |
| F4 | 附带伤害 | collateral_damage | ... |
| F5 | 自证清白 | self_justification | ... |
| F6 | 真相漂移 | truth_drift | ... |

---

## §6 深化维度

必须包含：

| 字段 | 说明 |
|------|------|
| dimension 枚举 | `deepen_notes[].dimension` 所有合法值 + 检查内容 |
| D1-D4 路由表 | `claim_type` → 深挖策略映射（设计文档 §6.4 对应） |

D1-D4 路由表格式：

| 策略 | 方法 | 路由信号（claim_type） | 对应 skill |
|------|------|----------------------|-----------|
| D1 | 删除测试 | evaluative, prescriptive | ... |
| D2 | 因果追溯 | causal | ... |
| D3 | 边界探测 | factual（边界型） | ... |
| D4 | 复现验证 | factual（核心型） | ... |

---

## §7 证据类型与校准维度

必须包含：

| 字段 | 说明 |
|------|------|
| evidence_type 枚举 | `evidence[].type` 所有合法值 |
| 证据权重指南 | 各类型证据的可信度权重 |
| 校准维度表 | 置信度校准时考虑的领域特异维度 |

---

## S0 lens-validate 校验清单

### 完整 lens（hegel 管线内使用）

| # | 校验项 | 类型 |
|---|--------|------|
| L1 | frontmatter 存在且含 lens_id, version, hard_cap | 结构 |
| L2 | §1-§7 section 标题全部存在 | 结构 |
| L3 | §2 category 枚举非空 | 语义 |
| L4 | §4 路由矩阵 5 行 × 3 列完整 | 结构 |
| L5 | §5 偏差检查 F1-F6 六条完整 | 结构 |
| L6 | §6 dimension 枚举非空 | 语义 |
| L7 | §7 evidence_type 枚举非空 | 语义 |

### 轻量级 lens（独立调用时使用）

轻量级 lens 用于 bayes/feynman 等 skill 在**不经过 hegel 管线**时获取领域适配。frontmatter 中 `lens_type: lightweight` 标识。

| # | 校验项 | 类型 |
|---|--------|------|
| LL1 | frontmatter 存在且含 lens_id, version, lens_type=lightweight（**不要求 hard_cap**） | 结构 |
| LL2 | §1 适用场景与领域识别 存在 | 结构 |
| LL3 | §2 策略路由/检查问题 按领域分化表完整（覆盖所有已定义 domain） | 结构 |
| LL4 | §3 证据权重/penalty_rules 按领域分化表完整 | 结构 |
| LL5 | §4 与 hegel lens 的关系 说明一致性要求 + 权威源声明 | 结构 |

> ⚠️ 轻量级 lens 不要求 §2-§7 的完整 hegel 格式，但必须覆盖上述 LL1-LL5。
> 轻量级 lens 的内容应与对应 hegel lens 保持语义一致（§4 一致性要求）。
