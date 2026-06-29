---
lens_id: bayes
version: 1.0.0
lens_type: lightweight
compatible_with: "bayes-v4.2 2026-06-12"
description: "bayes 独立调用时的领域适配层。hegel 管线内调用时使用 hegel lens §4。"
---

# Bayes 领域透镜（轻量级）

> **使用时机**：用户直接触发 `/bayes` 或 bayes 触发词时加载。
> **hegel 管线内**：不使用本文件，由 hegel lens §4 Skill 路由矩阵提供领域适配。

---

## §1 适用场景与领域识别

### 领域自动推断规则

| 信号 | 推断领域 | 优先级 |
|------|---------|--------|
| 输入包含文件路径、代码片段、PR/MR 引用 | code | 1（最高） |
| 输入包含股票代码、公司名、财报、thesis | investment | 2 |
| 输入包含 ADR、架构方案、技术选型、设计文档 | architecture-decision | 3 |
| 输入包含 PRD、需求文档、评审报告 | prd-review | 4 |
| 输入包含 idea-pool、SCAMPER、创意、发散 | ideation | 5 |
| 无法推断 | generic（使用默认策略） | 6（最低） |

> ⚠️ **多信号冲突时**：按优先级排序，取最高优先级信号对应的领域。例如：输入同时包含文件路径和 ADR 引用 → 推断为 code（优先级 1 > 3）。

### 领域列表

| domain | 说明 |
|--------|------|
| code | 代码验证：测试、API 调用、静态分析 |
| investment | 投资验证：财报、公告、市场数据、多源交叉 |
| architecture-decision | 架构验证：文档核实、POC、benchmark |
| ideation | 创意验证：事实核查、可行性评估 |
| prd-review | PRD 验证：原文核实、逻辑一致性 |
| generic | 通用验证：无领域特异策略 |

---

## §2 验证策略路由（B1/B2 按领域分化）

### B1 硬验证策略

| domain | B1 执行方式 | 典型数据源 |
|--------|-----------|-----------|
| code | 跑单元测试 / API 调用 / 静态分析 / grep 代码事实 | test runner, curl, ast-grep, wc/grep/find |
| investment | 查财报 / 公告 / 交易所数据 / FRED | SEC filing, OpenD, futuapi, web_search |
| architecture-decision | 查文档 / 合同 / POC 结果 / benchmark | 项目文档, RFC, benchmark 脚本 |
| ideation | 事实核查 / 数据验证 / 原型测试 | web_search, 快速 prototype |
| prd-review | PRD 原文直接核实 / 上下游文档交叉验证 | PRD 文档, 关联 spec |
| generic | 联网搜索 + 代码/文件查证 | web_search, read_file, grep |

### B2 软验证策略

| domain | B2 执行方式 | 交叉验证焦点 |
|--------|-----------|-------------|
| code | 双模型评估设计合理性 / 代码意图 vs 实际行为 | 设计模式适用性、边界覆盖 |
| investment | 多源交叉验证 / 卖方 vs 买方视角 | 数据一致性、叙事偏差 |
| architecture-decision | 双模型评估 trade-off / 备选方案完整性 | 约束覆盖度、可逆性 |
| ideation | 可行性交叉评估 / 用户价值 vs 技术成本 | 假设合理性、落地路径 |
| prd-review | 双模型独立解读需求 / 评审判断 vs 独立判断 | 歧义检测、遗漏检测 |
| generic | 双模型独立解读 / 多视角交叉 | 逻辑一致性、证据充分性 |

### mode_routing 补充规则

当 `composition.mode_routing` 选择 full_path 或 lite_path 后，再按 domain 选择具体的 B1/B2 执行方式。domain 不影响 full/lite 的选择，只影响执行内容。

---

## §3 证据类型权重

| evidence_type | code | investment | architecture-decision | ideation | prd-review | generic |
|--------------|------|-----------|----------------------|----------|-----------|---------|
| 一手数据（API/测试/财报） | 0.9 | 0.85 | 0.8 | 0.7 | 0.85 | 0.8 |
| 文档引用 | 0.6 | 0.5 | 0.7 | 0.4 | 0.8 | 0.5 |
| 逻辑推理 | 0.5 | 0.4 | 0.6 | 0.5 | 0.5 | 0.5 |
| 专家意见 / 卖方报告 | 0.3 | 0.5 | 0.4 | 0.3 | 0.3 | 0.4 |
| AI 生成内容 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |

### 校准提示

- **code**: 优先信任可复现的测试结果，文档可能过期
- **investment**: 一手财务数据 > 分析师报告 > 媒体叙事；注意时效性衰减
- **architecture-decision**: 文档和合同是高权重证据；POC 结果 > 理论论证
- **ideation**: 证据普遍较弱，重点标记不确定性而非追求高置信度
- **prd-review**: PRD 原文是最权威证据；关联文档用于交叉验证
- **generic**: 均衡对待各类证据，标注来源可靠性

---

## §4 与 hegel lens §4 的关系

| 场景 | 领域适配来源 | 说明 |
|------|------------|------|
| hegel 管线内 S3/S5 调用 bayes | hegel lens §4 | hegel 传入 `--lens {lens}`，bayes 使用 hegel lens 的 P2 行配置 |
| 用户直接触发 `/bayes` | 本文件（lens-bayes.md） | bayes 自行推断 domain，按 §2 选择 B1/B2 策略 |
| feynman 委派 bayes | 视上下文而定 | 若 feynman 在 hegel 管线内，用 hegel lens §4；若独立调用，用本文件 |

> ⚠️ **权威源声明**：hegel lens §4 为领域适配的权威源（SSOT）。本文件 §2 的策略应与对应 hegel lens §4 的 P2 行保持语义一致。**冲突时以 hegel lens §4 为准**。修改 hegel lens §4 后需同步更新本文件。
