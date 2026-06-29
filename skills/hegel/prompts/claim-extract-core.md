# Claim-Extract 通用骨架

> 此模板提供 60% 的提取逻辑，与 lens 无关。lens 注入块补充领域特异内容。

---

## 你的任务

从以下文本中提取所有**原子级可验证断言（claims）**。每条 claim 是一句话、可独立验证的陈述。

---

## Toulmin 分类规则

为每条 claim 分配类型：

| 类型 | 判定标准 | 关键信号词 |
|------|---------|-----------|
| factual | 存在明确真/假标准 | "是/不是""有/没有""等于/不等于" |
| causal | 含因果关系 | "导致""因为""所以""影响" |
| evaluative | 含价值判断 | "好/差""合理""过度""不足""强/弱" |
| prescriptive | 含行动建议 | "应该""建议""需要""必须" |
| predictive | 含概率预测 | "将会""预计""概率""可能达到" |

**优先级**：causal > predictive > prescriptive > evaluative > factual

---

## 不确定性标记规则

为每条 claim 标记初始不确定性：

- **deterministic**：可通过查阅文件/代码/数据库明确验证（适用于 factual, evaluative, prescriptive）
- **non_deterministic**：验证需要外部数据或本质随机（适用于 factual, evaluative, prescriptive, predictive）
- **tbd**：**仅用于 causal 类型**，S3 校准后细分为 epistemic 或 ontological

---

## 原子化规则

1. **单一命题**：一条 claim 只含一个可验证命题。含"且/并且/同时"的复合陈述必须拆分
2. **隐含假设显式化**：推荐/建议类陈述的前提假设单独提取（标记 `implicit: true`）
3. **保留锚点**：记录原文位置（source_location）和原文依据（groundings）
4. **不改语义**：规范化只改格式（统一句式），不改含义
5. **去冗余**：同一事实在不同段落出现时只提取一次，groundings 收集所有出处

---

## claim_category 分类规则

为每条 claim 分配判定类别：

| claim_category | 判定标准 | 说明 |
|----------------|---------|------|
| bug | 明确有问题 | 存在错误、缺陷、不一致 |
| design_gap | 设计缺口 | 缺少必要设计或架构考虑 |
| missing_feature | 缺失功能 | 应当有但未实现的功能 |
| confirm_no_change | 确认合理 | 经检查确认该方面设计/实现合理，无需修改 |

**分布要求**：每次提取至少产出 2-3 条 `confirm_no_change` 类别的 claim。如果所有 claim 均为问题类（bug/design_gap/missing_feature），说明分析框架存在「确认偏差」——预设了「原方案有问题」的备择假设，未检验零假设（「原方案大体正确」）。

---

## 输出格式

对每条 claim，输出：

```yaml
- id: "CL-{N}"           # 从 1 递增
  text: "规范化的断言陈述"
  type: factual|causal|evaluative|prescriptive|predictive
  claim_category: bug|design_gap|missing_feature|confirm_no_change
  uncertainty: deterministic|non_deterministic|tbd
  source_location:
    section: "章节名"
    paragraph: N
  groundings:
    - type: "quote"
      content: "原文引用"
  implicit: false
  confidence_extractable: 0.85  # 你对此 claim 确实存在于原文的信心
```

---

## 提取置信度评估

`confidence_extractable` 反映的是**此 claim 是否确实存在于原文**（不是 claim 内容是否正确）：

| 置信度 | 场景 |
|--------|------|
| 0.9-1.0 | 原文直接明确陈述 |
| 0.7-0.9 | 原文隐含但可合理推断 |
| 0.4-0.7 | 需要较多推断，原文仅间接提及 |
| < 0.4 | 过度推断，不应提取（过滤掉） |
