# Claim-Extract: Retrospective Lens 注入

> 与 claim-extract-core.md 组合使用。补充复盘收敛场景（hegel 报告/retro 文档）的领域锚点。

---

## 领域特异锚点

复盘收敛的 claim 来源是 hegel 收敛报告或 retro 复盘文档的各 section：

| 输入类型 | Section | 提取目标 | 典型 claim_type |
|---------|---------|---------|----------------|
| hegel 报告 | 确认的问题 | 已验证的发现及其置信度历程 | factual, evaluative |
| hegel 报告 | 已排除的问题 | 被 dismiss 的发现及排除理由 | evaluative |
| hegel 报告 | 未收敛的问题 | status=uncertain 的发现 | factual, causal |
| hegel 报告 | 归真对冲扫描 | debono 发现的价值点 | evaluative |
| hegel 报告 | 边界漂移检查 | scope 漂移发现 | evaluative |
| retro 文档 | What Went Well | 成功经验 | evaluative, factual |
| retro 文档 | What Didn't | 失败教训 | evaluative, causal |
| retro 文档 | Action Items | 改进行动 | prescriptive |
| retro 文档 | Insights | 深层洞察 | causal, evaluative |

---

## 复盘场景子类提示

| claim_type | 复盘场景细分 |
|------------|-------------|
| factual | 事实回顾（"本次迭代完成了 12 个 story"）/ 数据引用（"部署频率从月级提升到周级"）/ 状态记录（"3 个 finding 未收敛"） |
| causal | 根因分析（"因为缺少自动化测试，导致回归 bug 频发"）/ 效果归因（"引入 code review 后缺陷率下降 40%"）/ 模式识别（"每次赶工期都会跳过文档更新"） |
| evaluative | 价值判断（"这个改进措施效果显著"）/ 优先级评估（"这个问题比那个更紧急"）/ 沉淀价值评估（"这个发现值得写入团队规范"） |
| prescriptive | 行动建议（"应建立每周代码审查制度"）/ 规范建议（"所有 PR 必须包含测试"）/ 知识沉淀建议（"应将此经验写入 onboarding 文档"） |
| predictive | 趋势预测（"如果不改进，下季度缺陷率将继续上升"）/ 效果预测（"实施此改进后预计节省 20% 工时"） |

---

## 来源标记处理规则

1. **每条 claim 必须保留原始来源**：在 groundings 中记录 `source_section: "确认的问题"` 或 `source_document: "hegel-report-2026-06-10.md"`
2. **hegel finding 引用**：如果 claim 直接引用 hegel 报告中的 finding，在 groundings 中标注 `finding_ref: "F-3"` 和 `original_confidence: 0.87`
3. **retro 文档中的团队共识**：标注 `team_consensus: true` 和 `participant_count: N`
4. **debono 发现的价值点**：标注 `debono_origin: true`，S4 feynman 审查时重点关注是否被过度批判

---

## 过滤规则

复盘场景不提取：
- 纯情绪表达（"这次做得太好了！"——无具体命题）
- 元讨论（"我们需要更好的复盘流程"——关于过程而非内容，除非作为 process_improvement 类别提取）
- 重复表述（同一发现在不同 section 的措辞变体——只保留最完整的版本）
- 无法形成原子命题的碎片（单个词或短语）

---

## 复盘场景特殊规则

1. **finding 状态映射**：hegel 报告中 status=confirmed 的 finding 提取为 claim 时，初始 confidence_extractable ≥ 0.80；status=uncertain 的 ≥ 0.50；status=dismissed 的 ≥ 0.40（dismissed 不等于无价值，debono 可能恢复）
2. **行动项完整性检查**：如果 retro 文档有 What Didn't section 但 Action Items section 为空或缺少对应条目，追加一条 meta claim：`"以下问题缺少对应的行动项：{问题列表}"`（type: prescriptive, implicit: true, severity_hint: major）
3. **模式识别聚合**：如果多个 finding/观察指向同一个系统性模式，合并为一条 causal claim，groundings 收集所有出处，标注 `pattern_synthesis: true`
4. **隐含假设强制显式化**：复盘结论大量依赖未言明的前提（如"团队会持续执行这个规范"）。每条 prescriptive claim 必须检查是否有 implicit assumption，有则单独提取

---

## Few-shot 示例

**输入文本**（hegel 收敛报告片段）：

> ## 确认的问题（按严重度排序）
> ### critical F-3：SSOT 同步机制缺少校验
> - 证据：skill-sync 脚本未校验 checksum，导致副本与 SSOT 不一致
> - 置信度历程：0.60 → 0.75 → 0.88 → 0.92
> - 终态：confirmed (confidence: 0.92)
>
> ## 已排除的问题
> ### minor F-7：文档格式不统一
> - 排除理由：影响范围小，修复成本高于收益
> - 终态：dismissed (confidence: 0.12)
>
> ## 未收敛的问题
> ### epistemic F-5：跨平台 skill 加载顺序不确定
> - 当前置信度：0.55
> - 剩余不确定性：需要跨平台实测验证

**提取结果**：

```yaml
- id: "CL-1"
  text: "skill-sync 脚本未校验 checksum，导致副本与 SSOT 不一致"
  type: factual
  uncertainty: deterministic
  source_location: { section: "确认的问题", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "skill-sync 脚本未校验 checksum，导致副本与 SSOT 不一致"
    - type: "finding_ref"
      content: "F-3"
    - type: "original_confidence"
      content: "0.92"
  implicit: false
  finding_status: confirmed
  confidence_extractable: 0.92

- id: "CL-2"
  text: "SSOT 同步机制缺少校验是一个 critical 级别的问题"
  type: evaluative
  uncertainty: deterministic
  source_location: { section: "确认的问题", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "critical F-3"
    - type: "finding_ref"
      content: "F-3"
  implicit: false
  finding_status: confirmed
  confidence_extractable: 0.90

- id: "CL-3"
  text: "文档格式不统一的影响范围小，修复成本高于收益"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "已排除的问题", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "影响范围小，修复成本高于收益"
    - type: "finding_ref"
      content: "F-7"
    - type: "original_confidence"
      content: "0.12"
  implicit: false
  finding_status: dismissed
  confidence_extractable: 0.45

- id: "CL-4"
  text: "跨平台 skill 加载顺序不确定"
  type: factual
  uncertainty: non_deterministic
  source_location: { section: "未收敛的问题", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "跨平台 skill 加载顺序不确定"
    - type: "finding_ref"
      content: "F-5"
    - type: "original_confidence"
      content: "0.55"
  implicit: false
  finding_status: uncertain
  confidence_extractable: 0.55

- id: "CL-5"
  text: "验证跨平台 skill 加载顺序需要跨平台实测"
  type: factual
  uncertainty: deterministic
  source_location: { section: "未收敛的问题", paragraph: 1 }
  groundings:
    - type: "inference"
      content: "从 CL-4 的剩余不确定性显式化"
  implicit: true
  confidence_extractable: 0.70
```
