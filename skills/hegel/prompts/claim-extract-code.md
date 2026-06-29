# Claim-Extract: Code Lens 注入

> 与 claim-extract-core.md 组合使用。补充代码审查场景的领域锚点。

---

## 领域特异锚点

代码审查的 claim 来源：

| 来源 | 提取目标 | 示例 |
|------|---------|------|
| 代码注释 | 声明性断言（"此函数保证线程安全"） | factual / evaluative |
| 函数签名 | 接口契约隐含的假设 | factual |
| 错误处理 | "此异常不会发生"的隐含假设 | factual (implicit) |
| 设计文档 | 架构决策和理由 | evaluative / prescriptive |
| PR 描述 | 变更目的和预期效果 | causal / predictive |

---

## 代码场景子类提示

| claim_type | 代码场景细分 |
|------------|-------------|
| factual | 行为事实（"返回 null"）/ 性能事实（"O(n²) 复杂度"）/ 覆盖事实（"无测试"） |
| causal | 因果链（"缺少锁 → 竞态"）/ 依赖链（"A 调 B，B 改了 → A 坏了"） |
| evaluative | 设计评价（"过度耦合"）/ 性能评价（"不够快"）/ 可维护性评价 |
| prescriptive | 重构建议 / 拆分建议 / 迁移建议 |
| predictive | 性能预测（"P99 会降到 50ms 以下"）/ 扩展性预测 |

---

## 过滤规则

代码场景不提取：
- 纯格式/风格偏好（"应该用 tabs 不用 spaces"）
- 语言特性解释（"Python 的 GIL 是..."）
- 无争议的标准实践（"应该写单元测试"）

---

## Few-shot 示例

**输入文本**：
> 这个 parseDate 函数没有处理闰年的边界情况，当输入 "2024-02-29" 时会返回错误的日期。
> 建议改用 dateutil 库，它已经处理了所有边界情况。性能可能会有轻微下降但可以接受。

**提取结果**：

```yaml
- id: "CL-1"
  text: "parseDate 函数在输入 '2024-02-29' 时返回错误的日期"
  type: factual
  uncertainty: deterministic
  source_location: { paragraph: 1 }
  groundings: [{ type: "quote", content: "当输入 '2024-02-29' 时会返回错误的日期" }]
  implicit: false
  confidence_extractable: 0.95

- id: "CL-2"
  text: "parseDate 函数没有处理闰年的边界情况"
  type: causal
  uncertainty: tbd
  source_location: { paragraph: 1 }
  groundings: [{ type: "quote", content: "没有处理闰年的边界情况" }]
  implicit: false
  confidence_extractable: 0.90

- id: "CL-3"
  text: "应该用 dateutil 库替代当前实现"
  type: prescriptive
  uncertainty: non_deterministic
  source_location: { paragraph: 2 }
  groundings: [{ type: "quote", content: "建议改用 dateutil 库" }]
  implicit: false
  confidence_extractable: 0.90

- id: "CL-4"
  text: "dateutil 库已处理所有日期边界情况"
  type: factual
  uncertainty: deterministic
  source_location: { paragraph: 2 }
  groundings: [{ type: "quote", content: "它已经处理了所有边界情况" }]
  implicit: true
  confidence_extractable: 0.75

- id: "CL-5"
  text: "替换为 dateutil 后性能会有轻微下降"
  type: predictive
  uncertainty: non_deterministic
  source_location: { paragraph: 2 }
  groundings: [{ type: "quote", content: "性能可能会有轻微下降" }]
  implicit: false
  confidence_extractable: 0.85
```
