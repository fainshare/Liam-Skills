# Claim-Extract: Ideation Lens 注入

> 与 claim-extract-core.md 组合使用。补充创意收敛场景（osborn idea-pool）的领域锚点。

---

## 领域特异锚点

创意收敛的 claim 来源是 osborn 产出的 idea-pool.md，按来源标记分段：

| 来源标记 | 含义 | 提取目标 | 典型 claim_type |
|---------|------|---------|----------------|
| [P1] | 纯发散（量优先） | 原始想法碎片，可能不完整 | evaluative, prescriptive |
| [P2a-S] | SCAMPER 替换 | 对已有方案的变体 | factual, causal |
| [P2a-C] | SCAMPER 组合 | 跨领域组合想法 | causal, evaluative |
| [P2a-A] | SCAMPER 调整 | 规模/范围调整 | prescriptive |
| [P2a-M] | SCAMPER 修改 | 属性修改 | evaluative |
| [P2a-P] | SCAMPER 另用 | 跨界应用 | causal, predictive |
| [P2a-E] | SCAMPER 消除 | 减法创新 | prescriptive, evaluative |
| [P2a-R] | SCAMPER 重排 | 顺序/结构重组 | causal |
| [P2b-用户] | 用户直接输入 | 真实经验/需求/痛点 | factual, causal, evaluative |

---

## 创意场景子类提示

| claim_type | 创意场景细分 |
|------------|-------------|
| factual | 事实前提（"当前系统不支持 X"）/ 资源约束（"团队只有 3 人"）/ 外部事实（"竞品已上线 Y 功能"） |
| causal | 问题→方案因果（"因为 Z 导致效率低，所以引入 A"）/ 方案→效果因果（"采用 B 将减少 50% 手动操作"） |
| evaluative | 价值判断（"这个方向比那个更有潜力"）/ 可行性评价（"这个方案太复杂了"）/ 新颖度评价 |
| prescriptive | 行动建议（"应该先做原型验证"）/ 优先级建议（"这个想法值得 P0 投入"）/ 放弃建议 |
| predictive | 效果预测（"如果实施，预计 3 个月内见效"）/ 风险预测（"可能会遇到 X 阻力"） |

---

## 来源标记处理规则

1. **每条 claim 必须保留原始来源标记**：在 groundings 中记录 `source_tag: "[P2a-S]"` 等
2. **[P2b-用户] 来源的 claim 自动标记**：`user_originated: true`，触发 S2.5 rigor probe 的 attachment 维度额外检查
3. **[P1] 来源的 claim**：初始 confidence_extractable 上限 0.7（纯发散阶段的想法完整性较低）
4. **同一想法跨多个来源标记出现时**：合并为一条 claim，groundings 收集所有出处，confidence_extractable 上调 0.1（多源佐证）

---

## 过滤规则

创意场景不提取：
- 纯情绪表达（"这个想法太棒了！"——无具体命题）
- 元讨论（"我们需要更多想法"——关于过程而非内容）
- 重复表述（同一想法在不同段落的措辞变体——只保留最完整的版本）
- 无法形成原子命题的碎片（单个词或短语，无法判断真假/价值）

---

## 创意场景特殊规则

1. **隐含假设强制显式化**：创意想法大量依赖未言明的前提。每条 evaluative/prescriptive claim 必须检查是否有 implicit assumption，有则单独提取为一条 factual claim（标记 `implicit: true`）
2. **模糊度容忍**：与代码/投资不同，创意 claim 允许一定模糊度。只要能被理解为"某个可讨论的命题"即可提取，不要求精确到可立即验证
3. **组合想法拆分**：如果一条想法包含多个独立命题（"我们可以做 A，同时结合 B，最终实现 C"），拆分为多条 claim，并在 groundings 中标注 `combination_source: "CL-X,CL-Y"`
4. **问题-方案配对保留**：如果原文同时描述了问题和解决方案，分别提取为两条 claim（问题=factual/causal，方案=prescriptive），并在 groundings 中互相引用

---

## Few-shot 示例

**输入文本**（idea-pool.md 片段）：

> ## P1 纯发散
> [P1] 能不能把 nightly review 的结果直接推送到钉钉群？
> [P1] 也许可以用 AI 自动生成周报初稿
>
> ## P2a-S SCAMPER 替换
> [P2a-S] 把 trial pipeline 替换为 nightly review FC 概率状态表作为 weekly trigger
>
> ## P2b 用户输入
> [P2b-用户] 我每周花 3 小时手动整理周报，最大的痛点是从多个来源聚合信息

**提取结果**：

```yaml
- id: "CL-1"
  text: "Nightly review 的结果可以推送到钉钉群"
  type: prescriptive
  uncertainty: non_deterministic
  source_location: { section: "P1 纯发散", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "能不能把 nightly review 的结果直接推送到钉钉群？"
    - type: "source_tag"
      content: "[P1]"
  implicit: false
  confidence_extractable: 0.60

- id: "CL-2"
  text: "AI 可以自动生成周报初稿"
  type: causal
  uncertainty: tbd
  source_location: { section: "P1 纯发散", paragraph: 2 }
  groundings:
    - type: "quote"
      content: "也许可以用 AI 自动生成周报初稿"
    - type: "source_tag"
      content: "[P1]"
  implicit: true
  confidence_extractable: 0.55

- id: "CL-3"
  text: "AI 生成周报初稿的前提是存在结构化的报告模板和数据源"
  type: factual
  uncertainty: deterministic
  source_location: { section: "P1 纯发散", paragraph: 2 }
  groundings:
    - type: "inference"
      content: "从 CL-2 的隐含假设显式化"
  implicit: true
  confidence_extractable: 0.70

- id: "CL-4"
  text: "Trial pipeline 可以被 nightly review FC 概率状态表替代作为 weekly trigger"
  type: prescriptive
  uncertainty: non_deterministic
  source_location: { section: "P2a-S SCAMPER 替换", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "把 trial pipeline 替换为 nightly review FC 概率状态表作为 weekly trigger"
    - type: "source_tag"
      content: "[P2a-S]"
  implicit: false
  confidence_extractable: 0.80

- id: "CL-5"
  text: "用户每周花费约 3 小时手动整理周报"
  type: factual
  uncertainty: deterministic
  source_location: { section: "P2b 用户输入", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "我每周花 3 小时手动整理周报"
    - type: "source_tag"
      content: "[P2b-用户]"
  implicit: false
  user_originated: true
  confidence_extractable: 0.90

- id: "CL-6"
  text: "从多个来源聚合信息是周报整理过程中最大的痛点"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "P2b 用户输入", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "最大的痛点是从多个来源聚合信息"
    - type: "source_tag"
      content: "[P2b-用户]"
  implicit: false
  user_originated: true
  confidence_extractable: 0.85
```
