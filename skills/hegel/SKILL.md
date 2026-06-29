---
name: hegel
display_name: "太虚二转 · 澄源（黑格尔）"
visibility: public
description: 迭代收敛（太虚二转·澄源）：链式分析自动循环至稳定。触发词: 收敛, 黑格尔, hegel.
  Iterative convergence (太虚二转·澄源): chain analyses into auto-cycling pipeline until stable. Use when
  user says "收敛", "黑格尔", "hegel", "帮我盘一下".
version: 2.2.1
last_updated: 2026-06-12
author: fengling
status: active
tags: [hegel, convergence, bayes, feynman, iterative-analysis, lens]
triggers:
  - hegel
  - 黑格尔
  - 太虚二转
  - 澄源
  - 收敛
  - 收敛一下
  - 深度分析
  - 收敛分析
  - 帮我盘一下
  - 全面审查
  - 迭代分析
  - /hegel
dependencies:
  skills:
    - bayes               # S3 calibrate / S5 verify
    - feynman             # S4 偏差审查 / S5 R2
  optional_skills:
    - debono              # S7 归真对冲检查（防批判致死）
    - code-review-skill   # code lens 快速路径
    - deepen              # S5 深化
    - deep-research       # S5 epistemic 数据收集
metadata:
  visibility: public
---

# Hegel 黑格尔收敛

## 概述

做了一轮分析，总觉得有盲区？信息很多但看不出深层逻辑？多个结论互相矛盾？分析来分析去，原地打转？

单次分析天然有盲区。迭代收敛的做法是：把多种分析方法串成自动循环管线，每轮把发现送入校准、挑战、深化三个环节，直到不确定项稳定下来。校准对齐事实，挑战引入对立视角主动攻击结论，深化把存活的结论往下挖一层。该确认的确认，该排除的排除，该搁置的搁置。每轮结论都比上一轮更稳定。最终输出收敛报告，标注每条结论的置信度和剩余不确定项。

太虚五转第二转：澄源（收敛）。奥斯本（散怀）负责发散选项，贝叶斯（叩实）负责验证结论，黑格尔（澄源）负责迭代收敛。浊水静置，杂质沉淀，清水浮现。

## 1. 定位

**解决什么**：单次分析各自有盲区，发现看不到深层逻辑、验证易陷入自证、偏差检查不产出新发现。本 skill 将多种分析方法编排为**自动迭代管线**，通过三维架构实现跨领域的认知收敛。

**三维架构**：

```
            deterministic       epistemic          ontological
           ┌────────────────┬───────────────┬───────────────┐
  P1 发现  │ 提取断言       │ 提取断言      │ 提取断言       │
  P2 校准  │ 硬验证→二值   │ 软验证→区间   │ 概率分布→接受  │
  P3 偏差  │ F1 假设验证    │ F2+F5 框架    │ F2+F3 精确化   │
  P4 深化  │ 根因追溯       │ 证据扩展      │ 情景+鲁棒性    │
  P5 收敛  │ 二值判定       │ 区间窄化      │ 稳定性检查     │
  P6 报告  │            统一输出                            │
           └────────────────┴───────────────┴───────────────┘
                        领域透镜: code / investment / prd-review / ideation / architecture-decision / retrospective / specification-bridge
```

- **原则骨架（P1-P6）**：认知纪律链，不随领域变化
- **领域透镜（lens）**：定义"看什么"——分类枚举、skill 路由、偏差检查项、深化维度
- **不确定性路由**：定义"怎么想"——按 uncertainty_type 选推理策略和收敛标准

**不做什么**：不替代子 skill 的独立使用（简单任务直接用单个 skill）。

---

## 2. S0-S7 管线

```
用户输入 + --lens 参数
     │
S0   前置检查 + lens 校验 + 初始化 ──→ hegel-state.json
     │
S1   定界 ──→ scope（边界+维度+约束+预算）
     │     └─ scope-validate.py 校验
     │
S2   发现 ──→ claims[]（Toulmin 五型断言提取）
     │     └─ prompts/claim-extract-*.md（lens 快速路径可跳过）
     │
S2.5 rigor gate ──→ 断言质量预筛（5 维 rigor probes）
     │     └─ evidence / specificity / counterfactual / attachment / durability
     │
S3   校准 ──→ findings[]（初始置信度 + uncertainty_type 判定）
     │     └─ bayes mode:calibrate
     │
     ├── gate_check
     │
┌──→ S4   挑战 ──→ feynman_flags[]（偏差检查）
│       │     └─ feynman skill（lens 适配 F1-F6）
│       │
│       ├── gate_check + emergent 升级判定
│       │
│   S5   深化 ──→ confidence 更新 + deepen_notes
│       │     └─ lens 路由到对应 skill + bayes mode:verify
│       │
│       ├── gate_check
│       │
│   S6   收敛判定 ──→ exit code
│       │     └─ check-convergence.py
│       │
│   exit=1（未收敛）
└───────┘
     │
 exit=0|2
     │
S7   报告 + 漂移检查
```

### 内循环

S4→S5→S6 为一个完整内循环。`current_round` 在 S4 入口 +1。

### 各步骤职责

| 步骤 | 执行者 | 核心职责 |
|------|--------|---------|
| S0 | init-state.py + lens-validate | 创建 state.json 骨架，校验 lens 文件 7-section 结构 |
| S1 | LLM + scope-validate.py | 定义分析边界、维度、约束、预算 |
| S2 | LLM + `prompts/claim-extract-*.md` | 从目标文本提取原子断言（lens 快速路径可跳过） |
| S2.5 | hegel 自有（rigor probes） | 断言质量预筛，低分断言 dismiss 或 flag |
| S3 | bayes mode:calibrate | 快速定性校准 + 判定 uncertainty_type |
| S4 | feynman（--lens 适配） | 偏差检查 + emergent 约束发现 |
| S5 | lens 路由 skill + bayes mode:verify | 深挖 + 完整贝叶斯验证 |
| S6 | check-convergence.py | 类型感知收敛判定 |
| S7 | LLM | 报告生成 + S1 边界漂移检查 |

---

## 3. S0 — 前置检查 & 初始化

### 3.1 前置依赖检查

```bash
SKILL_DIR=$(dirname "$0")/..  # hegel skill 目录
python3 $SKILL_DIR/scripts/preflight-check.py --lens {lens}
```

退出码 0 = 就绪，1 = 缺失（阻塞，输出安装指引）。

### 3.2 Lens 校验

加载 `references/lens-{name}.md`，执行 L1-L7 结构校验（7 个 section 齐全）。缺失 section 阻塞管线。

### 3.3 初始化状态文件

```bash
python3 $SKILL_DIR/scripts/init-state.py \
  --target "{用户输入}" \
  --target-type {推断类型} \
  --lens {lens} \
  --max-rounds {N} \
  --output hegel-state.json
```

产出空骨架 state.json。Schema 见 `references/state-schema.md`。

### 3.4 确认摘要

输出：目标、lens、模式、收敛阈值（含 hard_cap）、最大轮次。自动进入 S1。

---

## 4. S1 — 定界

### 4.1 scope 结构

```yaml
scope:
  schema_version: 1
  revision: 1
  system_type: "deterministic | non_deterministic | mixed"
  system_type_rationale: "≥20 字说明"
  dimensions: [{id, name, description, weight, source, active}]
  success_criteria: [{id, description, type, params, linked_dimensions}]
  constraints:
    axioms: [{id, description, violation_action, check_type, check_rule, semantic_prompt}]
    parameters: [{id, name, value, description, violation_action, check_type, check_rule, semantic_prompt}]
  budget: {complexity, max_safety_valve_rounds, estimated_passes}
  provenance: {lens_id, user_overrides, pre_scan_inferred, auto_fill_ratio}
```

### 4.2 三层输入源（优先级高→低）

1. 用户 CLI 参数
2. Lens 模板默认值
3. LLM 预扫描推断

### 4.3 Scope 校验

```bash
python3 $SKILL_DIR/scripts/scope-validate.py scope.json
```

V1-V10 校验规则。退出码：0=通过，1=错误，2=仅告警。

---

## 5. S2 — 发现（断言提取）

### 5.1 通用路径

调用断言提取提示词（`prompts/claim-extract-*.md`），输入 target_text + lens + scope。

产出 `claims[]`，每条 claim 含 Toulmin 五型分类 + "2+1" 不确定性标记。

详见 `hegel/prompts/claim-extract-*.md`。

### 5.2 Lens 快速路径

当 lens 支持快速路径时（如 code lens，target_type 为 file/diff/pr），可跳过断言提取步骤，由领域 skill 直接产出 findings[]。

此时：
- S1 scope 从 lens 模板自动填充
- claims[] 为空，claim_finding_map 为空
- findings[].origin = `structural_discovery`

### 5.3 Architecture target_type 执行协议

当 `target_type == "architecture"` 时，**不走 lens-code 快速路径**，也不直接套用通用 claim-extract（因为架构决策论述不是代码/文档，无法被 claim-extract 提示词解析）。

#### 5.3.1 前置条件：物化输入

架构分析必须有**可被脚本和提示词消费的文本载体**。如果用户输入是对话中的口头论述，必须先物化为文档：

```bash
# 将架构论述写入临时文档作为 target_text
cat > /tmp/architecture-input.md << 'EOF'
{用户的架构决策论述}
EOF
```

物化后的文档作为 S2 claim-extract 的 `target_text` 输入。

#### 5.3.2 Scope 构建要求

architecture 类型的 scope 必须包含以下维度（区别于 code lens 的默认维度）：

| dimension | name | weight | source | active | 说明 |
|-----------|------|--------|--------|--------|------|
| consistency | 内部一致性 | 0.25 | lens_template | true | 方案内部是否自洽？各组件间有无矛盾？ |
| feasibility | 可行性 | 0.25 | lens_template | true | 在当前约束下是否可实现？ |
| maintainability | 可维护性 | 0.20 | lens_template | true | 长期维护成本是否可控？ |
| migration_risk | 迁移风险 | 0.15 | lens_template | true | 从现状迁移到目标状态的风险？ |
| alternative_coverage | 替代方案覆盖 | 0.15 | lens_template | true | 是否充分评估了替代方案？ |

system_type 默认为 `deterministic`（架构决策本身是确定性的，不确定性来自信息不完整）。

#### 5.3.3 发现分类

architecture 类型使用独立的 category 枚举（覆盖 lens-code §2 的默认分类）：

| category | 核心问题 |
|----------|---------|
| internal_consistency | 方案各部分是否自洽？ |
| assumption_validity | 关键假设是否成立？ |
| migration_feasibility | 迁移路径是否可行？ |
| alternative_gap | 是否有未评估的更优方案？ |
| scope_creep | 方案是否超出原始问题边界？ |
| dependency_risk | 对外部系统/团队的依赖是否可控？ |

#### 5.3.4 深化策略适配

| 策略 | architecture 场景方法 |
|------|---------------------|
| D1 删除测试 | "去掉这个设计决策，问题还能解决吗？" |
| D2 因果追溯 | 追踪"为什么选 A 不选 B"的完整推理链 |
| D3 边界探测 | 找方案的失效条件：规模翻倍、团队减半、时间压缩 |
| D4 复现验证 | 用独立视角（如 feynman subAgent）重新评估同一方案 |

#### 5.3.5 禁止行为

- **禁止**在无物化文档的情况下直接进入 S2 claim-extract
- **禁止**用手动推理替代 bayes calibrate / feynman subAgent
- **禁止**将 `--lite` 参数理解为"可以跳过步骤"——它仅影响 state.json 初始骨架
- **禁止**自行发明精简版/lite mode 执行流程；如果管线不适配，应触发 reassess_scope 或 halt，而非静默降级

### 5.4 质量检查

| 检查 | 标准 | 失败时 |
|------|------|--------|
| 提取率 | claims 数 ≥ 1 | gate escalate |
| 平均提取置信度 | ≥ 0.6 | 触发退化方案 |
| 类型覆盖 | ≥ 2 种 type | warning |
| 确认覆盖率 | confirm_no_change 占比 ≥ 15% | warning: 分析框架可能存在确认偏差（预设「原方案有问题」），未检验零假设 |

### 5.5 S2.5 — Rigor Gate（断言质量预筛）

S2 提取后、S3 校准前，对每条 claim 执行 5 维 rigor probes 质量预筛。

**来源**：ce-brainstorm 废弃后，其 rigor probes 能力（本质为收敛行为）归入 hegel。

#### 5.4.1 五维探针

| 维度 | 检查问题 | 评分 |
|------|---------|------|
| **evidence** | 这个断言有证据支撑吗？还是纯凭直觉？ | 0-2 |
| **specificity** | 够具体可验证吗？还是模糊到无法证伪？ | 0-2 |
| **counterfactual** | 考虑过反面吗？是否存在确认偏差？ | 0-2 |
| **attachment** | 是否过度依赖某个人/系统/历史决策？ | 0-2 |
| **durability** | 时间维度上站得住吗？6 个月后还成立吗？ | 0-2 |

#### 5.4.2 判定规则

```
rigor_score = sum(5 维得分) / 10    # 归一化到 0-1

if rigor_score ≥ 0.6:  pass → 进入 S3
if rigor_score ≥ 0.3:  flag → 标记 weak_evidence，进入 S3（S4 feynman 重点关注）
if rigor_score < 0.3:  dismiss → 追加到 dismissed_claims[]，不进入 S3
```

#### 5.4.3 Lens 定制

Lens 文件 §7 `rigor_probes` 可配置：
- 启用/禁用特定维度（如 code lens 禁用 durability）
- 调整阈值（如 investment lens 提高 evidence 阈值到 0.7）
- 新增领域特定维度

#### 5.4.4 产出

- `claims[]` 每条追加 `rigor_score` + `rigor_flags[]`
- `dismissed_claims[]` 记录被过滤的断言及理由
- state.json `rigor_summary` 记录通过率、各维度平均分

---

## 6. S3 — 校准

### 6.1 执行

若传入 `--standalone` 参数，**跳过本步骤**，直接产出空 findings[] 并标记 `skipped_by: standalone`，进入 S4。

否则，调用 bayes `mode:calibrate`，遍历 claims[] 产出 findings[]。

### 6.2 核心产出

- 每条 finding 的 `uncertainty_type`（deterministic / epistemic / ontological）
- 初始 confidence
- `claim_finding_map` 双向映射

### 6.3 claim→finding 映射规则

- 默认 1:1
- 合并：多条 claim 指向同一事实 → 一条 finding，claim_refs[] 含所有源 ID
- 过滤：confidence_extractable < 0.4 的 claim 不产生 finding
- 零 findings 安全网：触发 gate escalate
- **claim_category 继承**：finding 必须继承源 claim 的 `claim_category`（bug/design_gap/missing_feature/confirm_no_change），写入 finding 的 `claim_category` 字段。合并场景取最高优先级类别（bug > design_gap > missing_feature > confirm_no_change）

### 6.4 Status 转换规则

S3/S5 每次更新 confidence 后立即应用：

| 条件 | 转换 |
|------|------|
| confidence ≥ 0.85（deterministic 类型）| uncertain → confirmed |
| confidence ≤ 0.15（deterministic 类型）| uncertain → dismissed |
| epistemic 且 CI 宽度 < ci_threshold | uncertain → confirmed |
| ontological 且连续 2 轮 delta < 0.05 | uncertain → confirmed |

反向转换（confirmed → uncertain）仅在 S4 feynman 惩罚触发时发生。

### 6.5 Gate check

S3 完成后执行 gate_check（见 §9）。

---

## 7. S4 — 挑战（偏差审查）

### 7.1 执行

若传入 `--standalone` 参数，**跳过本步骤**，直接标记所有 findings 的 `feynman_flags` 为 `{skipped_by: standalone}`，进入 S5。

否则，调用 feynman，`--input findings --lens {lens}`。

逐条 finding 执行 P1-P6 审查，F1-F6 检查问题从 lens 文件 §5 动态加载。

### 7.2 标记处理

- 每条 finding 附加 `feynman_flags`
- 惩罚规则从 lens 文件 §5 `penalty_rules` 加载（默认：F1+F5 同时 ❌ → confidence -= 0.2，回退为 uncertain）
- 新发现 → 追加到 findings[]，origin=structural_discovery

### 7.3 先验重置信号

F1（未验证假设）或 F5（自证清白）触发 ❌ 时，向 S5 bayes 发送 `prior_source: feynman_reset` 信号。

### 7.4 Emergent 约束

分析中发现新约束 → 写入 `emergent_constraints[]`，status=cooling → 下一轮 feynman 审查后决定 promote 或 dismiss。

### 7.5 Gate check

S4 完成后执行 gate_check + emergent 升级判定。

---

## 8. S5 — 深化

### 8.1 目标

若传入 `--standalone` 参数，**跳过本步骤**，所有 findings 保持 S4 结束时的状态，直接进入 S6 收敛判定。

否则，仅对 `status=uncertain` 的 findings 执行深挖 + 完整贝叶斯验证。

### 8.2 深化策略路由

按 `claim_type` 选择策略（路由表在 lens 文件 §6 中）：

| 策略 | 方法 | 典型 claim_type |
|------|------|----------------|
| D1 删除测试 | "删掉假设，论点还站得住吗？" | evaluative, prescriptive |
| D2 因果追溯 | 追踪完整因果链 | causal |
| D3 边界探测 | 找边界条件和极端情况 | factual（边界型） |
| D4 复现验证 | 独立方法重新验证 | factual（核心型） |

### 8.3 按 uncertainty_type 路由 skill

从 lens 文件 §4 skill 路由矩阵加载。通用模式：

| uncertainty_type | 深化策略 | 验证方式 |
|------------------|---------|---------|
| deterministic | 根因追溯 → 复现 | bayes B1 硬验证 |
| epistemic | 证据扩展 → 多源补数据 | bayes B2 双模型 |
| ontological | 情景分析 → 鲁棒性测试 | bayes B2 概率分布 |

### 8.4 条件先验重置

收到 feynman_reset 信号的 finding，先验重置为 0.5。

### 8.5 Snap-back 检测

重置后后验落入重置前 ±0.05 区间 → 标记 `snap_back_detected`。severity ≥ high 时升级为 escalate。

### 8.6 Confidence Interval

epistemic findings 由 S5 bayes verify 产出 90% 可信区间（CI）。S3 不产出 CI。

### 8.7 新增 finding / claim

S5 可追加新 claims 和 findings（标注 source_pass）。新 findings 的 uncertainty_type 由 S5 inline 分配（type_source=S5_inline），下一轮 S4 入口审查合理性。

### 8.8 重分类

发现 uncertainty_type 判定有误时：新增 finding（修正后类型）+ dismiss 原 finding。证据继承规则见 `references/convergence-criteria.md`。

### 8.9 Gate check

S5 完成后执行 gate_check。

---

## 9. 底线门禁系统

### 9.1 触发时机

每步写完 state.json 后、进入下一步前。

```
Sx 执行 → 写 state.json → gate_check() → {continue|warn|escalate|reassess_scope|halt} → Sx+1 或终止
```

### 9.2 三种约束

| 类型 | 方向 | 违反响应 |
|------|------|---------|
| Axiom | 不可变 | halt |
| Parameter | 阈值可调 | warn / escalate |
| Emergent | 运行时发现 | 冷却→升级 |

### 9.3 检查逻辑

- **structural**：Python 规则求值，<10ms/条
- **semantic**：独立 LLM 调用，2-5s/条。semantic 约束总数建议不超 10 条

### 9.4 五级响应

| 响应 | 行为 |
|------|------|
| continue | 无违规，继续 |
| warn | 追加 gate_log[]，继续 |
| escalate | 追加 gate_flags[]，继续。同一约束连续 2 次 escalate → 自动 halt |
| reassess_scope | 回退到 S1 重新定界（仅限 S3/S4 后首次）。claims[] 标记 superseded，claim_derived findings dismissed |
| halt | 写 abort_reason → status=aborted → 终止 → 输出违规报告 |

---

## 10. S6 — 收敛判定

### 10.1 执行

```bash
python3 $SKILL_DIR/scripts/check-convergence.py hegel-state.json
```

退出码：0=已收敛，1=未收敛，2=安全阀截断。

### 10.2 五项收敛条件（AND 逻辑）

| 条件 | 说明 |
|------|------|
| C1 | 置信度稳定（delta 按类型分化：deterministic=0.03，其余=0.05） |
| C2 | 无新增 findings |
| C3 | 无翻转 + 伪稳定检测（仅 epistemic） |
| C4 | 类型感知收敛（deterministic→二值，epistemic→CI<0.3，ontological→稳定 2 轮） |
| C5 | 无 unresolved escalated 约束违规 |

详见 `references/convergence-criteria.md`。

### 10.3 安全阀

```
max_rounds = base + onto_bonus(1 if any ontological else 0)
hard_cap = lens 级参数（从 lens frontmatter 加载）
```

### 10.4 未收敛时

输出进度摘要，回到 S4（current_round +1）。

---

## 11. S7 — 报告 + 漂移检查

### 11.1 漂移检查

对比 S1 scope 与实际分析轨迹，检测边界漂移。

### 11.2 黄帽对冲检查（可选）

收敛完成后、报告生成前，执行正面价值扫描，防止「批判致死」。

**触发条件**（满足任一即触发）：
- 收敛结果中 dismissed 数 / total 数 > 0.7（超过 70% 的发现被排除）
- 所有 finding 的终态 confidence 中位数 < 0.3
- 用户显式传入 `--debono` 参数

**执行**：调用 debono skill（可选依赖），输入为 S1 scope + findings[] 全量（含 dismissed）。

**产出**：
- `debono_scan`：存活论证 + 四维价值扫描（用户价值、技术收益、团队成长、战略对齐）
- `counterbalance_verdict`：是否存在「被批判掩盖的真实价值」

**不触发时**：`debono_scan = null`，不影响报告。

### 11.3 八种终态

| 终态 | S6 | S7 漂移 | 含义 |
|------|-----|---------|------|
| converged | 收敛 | 无 | 结论可信 |
| converged_with_blind_spots | 收敛 | 有 | 边界可能遗漏 |
| converged_with_counterbalance | 收敛 | 无 | 结论可信，但 debono 发现被批判掩盖的价值点 |
| truncated | 截断 | 无 | 部分未收敛，需人工判断 |
| truncated_with_blind_spots | 截断 | 有 | 建议重新定界 |
| aborted | — | — | gate halt 触发 |
| initialized | — | — | 初始态 |
| in_progress | — | — | 执行中 |

### 11.4 报告结构

```markdown
# 收敛分析报告：{target}

## 收敛摘要
| 指标 | 值 |
|------|-----|
| 分析轮次 | {rounds} |
| 终态 | {status} |
| 总发现数 | {total} |
| 按类型收敛 | deterministic: N/M, epistemic: N/M, ontological: N/M |

## 确认的问题（按严重度排序）
### {severity} {F_id}：{description}
- 证据 / 置信度历程 / 贝叶斯分析 / 偏差检查 / 深化评估
- effective_severity = {raw_severity} → {adjusted_severity}（confidence: {conf}）
  <!-- 计算规则见 §11.5 -->

## 零假设检验
> 如果原方案大体正确（零假设成立），我们应该看到什么证据？

| # | 零假设断言 | 验证结果 | 证据 |
|---|-----------|---------|------|
| H1 | {如果方案没问题，X 应该是这样} | ✅ 通过 / ❌ 未通过 | {具体证据} |

**零假设结论**：{N/M 条零假设通过 → 方案核心合理/存在系统性问题}

> ⚠️ 如果零假设检验全部缺失（0 条），报告结论的可信度降低——分析可能过度聚焦于「找问题」而忽视了「确认合理」。

## 已排除的问题
## 未收敛的问题（如有）
## 归真对冲扫描（debono，如触发）
## 边界漂移检查（如有）
## 审计日志
```

### 11.5 severity-confidence 耦合规则

severity 判定必须考虑 confidence（即断言为真的概率），而非仅基于 impact（断言为真时的影响）。

**规则**：
- `effective_severity = f(raw_severity, confidence)`
- confidence < 0.6 → critical 自动降为 major
- confidence < 0.4 → critical 自动降为 minor
- 各 lens severity 判定表的 critical 行必须包含 confidence 约束列

**理由**：低置信度断言因「最坏情况思维」获得 critical 标签——把不确定猜测包装成紧急问题。C1 被标为 critical（最高严重度）但置信度仅 0.55（刚过硬币翻转），就是典型反例。

**报告展示**：每条 finding 同时展示 raw_severity 和 effective_severity，让读者清楚看到 confidence 对严重度的影响。

报告路径：`docs/hegel-reports/{target_slug}-hegel-{date}.md`

> 💡 **规格化桥接提示**：findings 中的 confirmed/uncertain 条目可被提取为 R-numbered Requirements（如 "R1. MUST 解决 F3 指出的 X 问题"），用于后续 ce-plan/ce-brainstorm 规格化输入。

---

## 12. 不确定性路由速查

### 12.1 两阶段分类

| 阶段 | 粒度 |
|------|------|
| S2 提取 | "2+1"（deterministic / non_deterministic / causal→tbd） |
| S3 校准 | 三分法（deterministic / epistemic / ontological） |

### 12.2 按类型路由

| 原则 | deterministic | epistemic | ontological |
|------|--------------|-----------|-------------|
| P2 校准 | 硬验证→二值 | 软验证→区间 | 概率分布→接受 |
| P3 偏差 | F1 假设验证 | F2+F5 框架 | F2+F3 精确化 |
| P4 深化 | 根因追溯→复现 | 证据扩展→多源 | 情景+鲁棒性 |
| P5 收敛 | ≥0.85 或 ≤0.15 | CI<0.3 | 稳定 2 轮 |

---

## 13. 跨窗口恢复

1. `read_file: hegel-state.json`
2. 检查 `current_pass` 和 `current_round`
3. 从当前步骤开头继续
4. findings 和 pass_log 保留已有数据

---

## 14. 路由索引

| 需要什么 | 加载什么 | 何时 |
|---------|---------|------|
| 透镜接口规范 | `references/lens-interface.md` | 扩展新 lens 时 |
| 代码透镜 | `references/lens-code.md` | --lens code |
| 投资透镜 | `references/lens-investment.md` | --lens investment |
| PRD 评审质量透镜 | `references/lens-prd-review.md` | --lens prd-review |
| 创意收敛透镜 | `references/lens-ideation.md` | --lens ideation |
| 架构决策透镜 | `references/lens-architecture-decision.md` | --lens architecture-decision |
| 复盘收敛透镜 | `references/lens-retrospective.md` | --lens retrospective |
| 规格化桥接透镜 | `references/lens-specification-bridge.md` | --lens specification-bridge |
| Bayes 独立调用领域适配 | `.agents/skills/bayes/references/lens-bayes.md` | 用户直接触发 /bayes 时（跨 skill 引用） |
| Feynman 独立调用领域适配 | `.agents/skills/feynman/references/lens-feynman.md` | 用户直接触发 /feynman 时（跨 skill 引用） |
| 状态 Schema | `references/state-schema.md` | 每步写入前 |
| 收敛规则 | `references/convergence-criteria.md` | S6 判定时 |
| 断言提取 | `prompts/claim-extract-*.md`（内置提示词） | S2 |
| 初始化 | `scripts/init-state.py` | S0 |
| Scope 校验 | `scripts/scope-validate.py` | S1 |
| 收敛检查 | `scripts/check-convergence.py` | S6 |

---

## 15. 调用方式

```
# 代码审查（默认 code lens）
/hegel
/hegel src/core/parser.ts
/hegel "PR !1234"

# 投资分析
/hegel --lens investment --target "APP thesis" --target-type thesis
/hegel --lens investment --target "康方生物 FC 审查" --target-type fc

# PRD 评审质量分析
/hegel --lens prd-review --target "差异单评审报告" --target-type prd_review

# 创意收敛（osborn idea-pool → hegel）
/hegel --lens ideation --target idea-pool.md --target-type idea_pool

# 架构决策分析
/hegel --lens architecture-decision --target "SSOT+sync架构方案.md" --target-type adr
/hegel --lens architecture-decision --target "多项目skill共享架构方案" --target-type architecture_discussion
# 注意：非文件输入需先固化为 ADR 格式文档

# 复盘收敛（hegel 报告 → 经验沉淀）
/hegel --lens retrospective --target "docs/hegel-reports/ssot-sync-hegel-2026-06-14.md" --target-type hegel_report
# 自动触发 debono 归真对冲

# 规格化桥接（hegel findings → requirements doc）
/hegel --lens specification-bridge --target "docs/hegel-reports/ssot-sync-hegel-2026-06-14.md" --target-type hegel_findings
# 产出 PF + R-numbered + SC-numbered，可直接作为 ce-plan 输入

# 自定义参数
/hegel --lens code --threshold 0.8 --max-rounds 3

# 独立模式（taixu-pipeline 编排器专用）
/hegel --standalone --lens ideation --target idea-pool.md --target-type idea_pool
# ⚠️ --standalone 跳过 S3/S4/S5 中的 bayes/feynman 内嵌调用
# 仅当由 taixu-pipeline composed skill 编排时传入；独立调用 /hegel 时禁止使用
```

---

## 16. 设计决策

| # | 决策 | 理由 |
|---|------|------|
| D1 | 三维架构（骨架×透镜×路由） | 领域扩展只需新建 lens 文件，不改核心管线 |
| D2 | JSON 状态落盘 | 支持跨窗口恢复、审计追溯、收敛脚本自动判定 |
| D3 | 类型感知收敛 | 不同不确定性类型有不同的"确定够了"标准 |
| D4 | 底线门禁独立横切 | 不嵌入步骤内部，统一触发时机和响应协议 |
| D5 | 安全阀参数化 | hard_cap 按 lens 分化 + onto_bonus，避免无限循环 |
| D6 | Lens 快速路径 | 保留 code lens 直出 findings 的效率，不强制 claim-extract |
| D7 | Emergent 约束冷却期 | 防止运行时发现的约束在未经审查前影响判定 |
| D8 | S2.5 rigor gate 预筛 | 断言质量预筛过滤低质量 claim，减少 S3 bayes 算力浪费；rigor probes 从 ce-brainstorm 吸收 |
| D9 | debono 归真对冲检查点 | 防止纯批判管线导致「批判致死」，确保被排除方案的价值面被记录 |
| D10 | Architecture target_type 物化前置 | 架构论述不是代码/文档，无法被 claim-extract 直接解析；强制物化为文档后再走通用路径，避免静默降级为手动推理 |
| D11 | --lite 仅影响初始化骨架 | lite_mode 只改变 state.json 初始参数，不作为跳过步骤的许可证；防止 Agent 自行发明精简版执行流程 |
| D12 | --standalone 防嵌套降级 | taixu-pipeline 编排器传入时跳过 S3/S4/S5 内嵌 bayes/feynman，由 pipeline 后续步骤使用独立 skill 完整能力；独立调用 /hegel 时禁止使用此参数 |
