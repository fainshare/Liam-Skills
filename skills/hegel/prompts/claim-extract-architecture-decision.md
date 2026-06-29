# Claim-Extract: Architecture Decision Lens 注入

> 与 claim-extract-core.md 组合使用。补充架构决策（ADR/设计论述）场景的领域锚点。

---

## 领域特异锚点

架构决策分析的 claim 来源是 ADR 或类似结构化文档的各 section：

| ADR Section | 提取目标 | 典型 claim_type |
|-------------|---------|----------------|
| Context | 问题描述、约束条件、背景事实 | factual, causal |
| Decision | 核心主张、选定方案 | prescriptive |
| Rationale | 支撑论点、推理链 | causal, evaluative |
| Alternatives Considered | 备选方案及其拒绝理由 | evaluative, factual |
| Trade-offs | 代价、风险、妥协 | evaluative, causal |
| Evidence / Precedents | 数据、先例、benchmark | factual |
| Open Questions | 未决问题、待验证假设 | factual (implicit) |

---

## 架构决策场景子类提示

| claim_type | 架构决策场景细分 |
|------------|-----------------|
| factual | 技术事实（"Kubernetes 支持自动扩缩容"）/ 资源约束（"团队只有 3 名后端"）/ 合规要求（"GDPR 要求数据本地化"）/ 先例事实（"Netflix 在 2018 年迁移到微服务"） |
| causal | 问题→方案因果（"因为单体部署慢，所以拆分为微服务"）/ 方案→效果因果（"引入缓存将减少 80% 数据库查询"）/ 依赖因果（"选择 AWS 意味着绑定其生态"） |
| evaluative | 方案评价（"微服务比单体更适合当前团队规模"）/ 风险评估（"这个方案的运维复杂度较高"）/ 备选方案比较（"方案 A 比方案 B 更灵活但成本更高"） |
| prescriptive | 决策声明（"我们选择 PostgreSQL 而非 MongoDB"）/ 行动建议（"应先做 POC 再全面推广"）/ 约束声明（"所有新服务必须通过 gRPC 通信"） |
| predictive | 效果预测（"预计迁移后部署频率从月级提升到日级"）/ 风险预测（"6 个月内可能需要重构认证模块"）/ 规模预测（"当前架构可支撑到 10x 流量"） |

---

## ADR 结构感知规则

1. **Decision section 的 claim 标记为 `decision_core: true`**：这是整个 ADR 的核心主张，S4 feynman 审查时重点关注
2. **Alternatives Considered 中每个备选方案的拒绝理由单独提取**：即使原文写在一起，也拆分为独立的 evaluative claim
3. **Trade-offs 中的每条代价单独提取**：标记 `tradeoff: true`，S5 深化时优先做 D3 边界探测
4. **Open Questions 中的每个问题提取为 factual claim**：标记 `implicit: true, open_question: true`，初始 confidence_extractable 上限 0.5
5. **Rationale 中的隐含假设强制显式化**：如果论点依赖未言明的前提，单独提取为一条 factual claim（标记 `implicit: true`）

---

## 过滤规则

架构决策场景不提取：
- 通用技术描述（"微服务是一种架构风格"——无具体决策关联）
- 纯历史叙述（"我们在 2020 年开始用 Docker"——除非用于类比论证）
- 情绪表达（"这个方案太棒了！"——无具体命题）
- 元讨论（"我们需要更多时间来评估"——关于过程而非内容）

---

## 架构决策特殊规则

1. **备选方案完整性检查**：如果 ADR 没有 Alternatives Considered section 或该 section 为空，在提取完成后追加一条 meta claim：`"此决策未记录备选方案评估"`（type: evaluative, implicit: true, severity_hint: major）
2. **证据锚点保留**：含具体数据/URL/文档引用的 claim 必须在 groundings 中保留原始引用
3. **时间锚点保留**：含时间的 claim 必须保留具体日期/版本/里程碑
4. **决策-理由配对保留**：如果 Decision 和 Rationale 紧密关联，分别提取但在 groundings 中互相引用（`linked_claim: "CL-X"`）

---

## Few-shot 示例

**输入文本**（ADR 片段）：

> ## Context
> 当前单体应用部署耗时 45 分钟，每周只能发布一次。团队 8 人，其中 3 名后端。
>
> ## Decision
> 采用事件驱动微服务架构替换现有单体。
>
> ## Rationale
> 微服务可以实现独立部署，将部署频率从周级提升到日级。
> 事件驱动解耦服务间依赖，避免分布式事务的复杂性。
>
> ## Alternatives Considered
> - 模块化单体：开发成本低但无法实现独立部署，不满足核心需求
> - Serverless：运维简单但冷启动延迟不可接受（P99 > 2s）
>
> ## Trade-offs
> - 运维复杂度显著增加，需要引入 Kubernetes
> - 团队需要学习事件驱动模式，预计 2 个月上手期

**提取结果**：

```yaml
- id: "CL-1"
  text: "当前单体应用部署耗时 45 分钟"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Context", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "部署耗时 45 分钟"
  implicit: false
  confidence_extractable: 0.95

- id: "CL-2"
  text: "当前每周只能发布一次"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Context", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "每周只能发布一次"
  implicit: false
  confidence_extractable: 0.95

- id: "CL-3"
  text: "团队共 8 人，其中 3 名后端"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Context", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "团队 8 人，其中 3 名后端"
  implicit: false
  confidence_extractable: 0.95

- id: "CL-4"
  text: "采用事件驱动微服务架构替换现有单体"
  type: prescriptive
  uncertainty: non_deterministic
  source_location: { section: "Decision", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "采用事件驱动微服务架构替换现有单体"
  implicit: false
  decision_core: true
  confidence_extractable: 0.95

- id: "CL-5"
  text: "微服务可以实现独立部署，将部署频率从周级提升到日级"
  type: causal
  uncertainty: tbd
  source_location: { section: "Rationale", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "微服务可以实现独立部署，将部署频率从周级提升到日级"
    - type: "linked_claim"
      content: "CL-4"
  implicit: false
  confidence_extractable: 0.85

- id: "CL-6"
  text: "微服务独立部署的前提是团队具备容器化和 CI/CD 能力"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Rationale", paragraph: 1 }
  groundings:
    - type: "inference"
      content: "从 CL-5 的隐含假设显式化"
  implicit: true
  confidence_extractable: 0.70

- id: "CL-7"
  text: "事件驱动解耦服务间依赖，避免分布式事务的复杂性"
  type: causal
  uncertainty: tbd
  source_location: { section: "Rationale", paragraph: 2 }
  groundings:
    - type: "quote"
      content: "事件驱动解耦服务间依赖，避免分布式事务的复杂性"
  implicit: false
  confidence_extractable: 0.80

- id: "CL-8"
  text: "模块化单体无法满足独立部署的核心需求"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "Alternatives Considered", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "模块化单体：开发成本低但无法实现独立部署，不满足核心需求"
  implicit: false
  confidence_extractable: 0.85

- id: "CL-9"
  text: "Serverless 的冷启动延迟不可接受（P99 > 2s）"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Alternatives Considered", paragraph: 2 }
  groundings:
    - type: "quote"
      content: "Serverless：运维简单但冷启动延迟不可接受（P99 > 2s）"
  implicit: false
  confidence_extractable: 0.90

- id: "CL-10"
  text: "采用微服务架构将导致运维复杂度显著增加"
  type: evaluative
  uncertainty: non_deterministic
  source_location: { section: "Trade-offs", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "运维复杂度显著增加"
  implicit: false
  tradeoff: true
  confidence_extractable: 0.85

- id: "CL-11"
  text: "引入微服务需要引入 Kubernetes"
  type: factual
  uncertainty: deterministic
  source_location: { section: "Trade-offs", paragraph: 1 }
  groundings:
    - type: "quote"
      content: "需要引入 Kubernetes"
  implicit: false
  tradeoff: true
  confidence_extractable: 0.90

- id: "CL-12"
  text: "团队学习事件驱动模式预计需要 2 个月上手期"
  type: predictive
  uncertainty: non_deterministic
  source_location: { section: "Trade-offs", paragraph: 2 }
  groundings:
    - type: "quote"
      content: "预计 2 个月上手期"
  implicit: false
  tradeoff: true
  confidence_extractable: 0.75
```
