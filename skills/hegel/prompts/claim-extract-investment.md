# Claim-Extract: Investment Lens 注入

> 与 claim-extract-core.md 组合使用。补充投资分析场景的领域锚点。

---

## 领域特异锚点

投资分析的 claim 来源：

| 来源 | 提取目标 | 示例 |
|------|---------|------|
| thesis FC 因果链 | 核心逻辑断言 | causal |
| 财报数据引用 | 事实性数字 | factual |
| 管理层评价 | 价值判断 | evaluative |
| 仓位建议 | 配置决策 | prescriptive |
| 催化剂预测 | 时间/概率预测 | predictive |
| 估值假设 | 隐含的增长/折现假设 | factual (implicit) |

---

## 投资场景子类提示

| claim_type | 投资场景细分 |
|------------|-------------|
| factual | 财务事实（"FY2025 收入 12 亿"）/ 持仓事实（"占比 8%"）/ 监管事实（"8-K 已提交"） |
| causal | FC 因果链（"降息 → 估值扩张"）/ 业务逻辑（"用户增长 → take rate 提升 → 利润增长"） |
| evaluative | 管理层评价（"资本配置能力强"）/ 估值评价（"当前估值偏低"）/ 竞争力评价 |
| prescriptive | 仓位建议（"应加仓至 10%"）/ 层级建议（"应归入 survival_base"）/ 时机建议 |
| predictive | 催化剂预测（"SKB264 2027 年获批概率 60%"）/ 财务预测（"take rate 从 2.5% 升至 3.5%"） |

---

## 过滤规则

投资场景不提取：
- 通用市场描述（"股市有风险"）
- 无具体标的的宏观叙事（"全球经济放缓"——除非与具体 FC 关联）
- 纯历史叙述（"2020 年疫情导致..."——除非用于类比论证）

---

## 投资场景特殊规则

1. **FC 因果链完整提取**：即使一条 FC 链条有多个环节，每个环节单独提取为一条 causal claim
2. **数字断言精确化**：含数字的 claim 必须保留原始数值和单位
3. **时间锚点保留**：含时间的 claim 必须保留具体日期/季度/年份
4. **tier 相关断言标注**：涉及三层架构归属的 claim 在 groundings 中标注 `tier_relevant: true`

---

## Few-shot 示例

**输入文本**：
> 康方生物 AK112（依沃西双抗）是 PD-1/VEGF 双抗赛道的领先者，在 NSCLC 一线治疗中
> 已展现出优于 K 药的 PFS 数据。公司 FY2024 营收 18.2 亿元，同比增长 127%。
> 管理层在资本配置上比较保守，账上现金充裕。建议维持 value_anchor 层 5% 配置，
> 等待 AK112 2025Q3 FDA 审批结果作为加仓催化剂。

**提取结果**：

```yaml
- id: "CL-1"
  text: "AK112（依沃西双抗）在 PD-1/VEGF 双抗赛道处于领先位置"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "thesis", paragraph: 1 }
  groundings: [{ type: "quote", content: "PD-1/VEGF 双抗赛道的领先者" }]
  implicit: false
  confidence_extractable: 0.90

- id: "CL-2"
  text: "AK112 在 NSCLC 一线治疗中 PFS 数据优于 K 药"
  type: factual
  uncertainty: deterministic
  source_location: { section: "thesis", paragraph: 1 }
  groundings: [{ type: "quote", content: "已展现出优于 K 药的 PFS 数据" }]
  implicit: false
  confidence_extractable: 0.95

- id: "CL-3"
  text: "康方生物 FY2024 营收 18.2 亿元，同比增长 127%"
  type: factual
  uncertainty: deterministic
  source_location: { section: "thesis", paragraph: 1 }
  groundings: [{ type: "quote", content: "FY2024 营收 18.2 亿元，同比增长 127%" }]
  implicit: false
  confidence_extractable: 0.95

- id: "CL-4"
  text: "AK112 的临床优势将转化为商业化成功"
  type: causal
  uncertainty: tbd
  source_location: { section: "thesis", paragraph: 1 }
  groundings: [{ type: "inference", content: "从临床数据优势推断商业化前景" }]
  implicit: true
  confidence_extractable: 0.70

- id: "CL-5"
  text: "管理层在资本配置上比较保守"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "thesis", paragraph: 2 }
  groundings: [{ type: "quote", content: "管理层在资本配置上比较保守" }]
  implicit: false
  confidence_extractable: 0.85

- id: "CL-6"
  text: "应维持 value_anchor 层 5% 配置"
  type: prescriptive
  uncertainty: non_deterministic
  source_location: { section: "thesis", paragraph: 2 }
  groundings: [{ type: "quote", content: "建议维持 value_anchor 层 5% 配置" }]
  implicit: false
  confidence_extractable: 0.90

- id: "CL-7"
  text: "AK112 FDA 审批结果预计 2025Q3 公布"
  type: predictive
  uncertainty: non_deterministic
  source_location: { section: "thesis", paragraph: 2 }
  groundings: [{ type: "quote", content: "等待 AK112 2025Q3 FDA 审批结果" }]
  implicit: false
  confidence_extractable: 0.85
```
