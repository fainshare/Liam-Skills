---
name: bayes
display_name: "太虚三转 · 叩实（贝叶斯）"
description: >
  Fact verification (太虚三转·叩实): decompose conclusion → testable predictions → external data
  validation. Use when user says "验证", "贝叶斯", "bayes", "靠谱吗".
version: "4.2.0"
visibility: public
last_updated: "2026-06-12"
kind: composed
metadata:
  author: "Antifragile Research Team"
  philosophy: "只有被真实数据打脸才能进步——没有外部事实冲击，就没有认知增量"
  origin: "v3.4 三视角诊断 + depth-engine-principles v1.2 定稿 + spike 验证，2026-06-06"
  risk: medium
  capabilities:
    - filesystem-write
    - network
  theoretical_basis:
    - "Popper: Conjectures and Refutations (1963)"
    - "Lakatos: The Methodology of Scientific Research Programmes (1978)"
    - "Tetlock: Superforecasting (2015)"
    - "Good: Expected Value of Information"
    - "Argyris: Double-Loop Learning (1977)"
triggers:
  - bayes
  - bayes一下
  - 跑一遍bayes
  - 太虚三转
  - 贝叶斯
  - 叩实
  - 验证
  - 验证一下
  - 贝叶斯验证
  - 深挖
  - 深挖一下
  - /bayes
  - 挖透
  - 刨根问底
  - 经得起推敲吗
  - 站得住脚吗
  - 盘一盘
  - 掰开看看
composition:
  execution: scripts/workflow.js
  final_output: report
  mode_routing:
    classifier: Phase 1 复杂度分 (因子数 × 耦合度系数)
    threshold: 6.0
    full_path: "≥6.0 → 5 维度独立审查"
    lite_path: "<6.0 → 2 agent 对抗"
  hard_constraints:
    min_error_band_pp: 5
    min_rounds_before_saturated: 2
    calibration_anchor: "上轮有缺陷但带未扩大 → 强制 CONTINUE"
---

# Bayes 贝叶斯验证

> 你说"应该是 X"。真的吗？这个 skill 帮你查。
> 把结论拆成预测，拿真实数据去验，预测错了的地方就是你的盲区。

> *"The first principle is that you must not fool yourself — and you are the easiest person to fool."*
> — Richard Feynman

## 概述

结论有了：投资判断、技术选型、方案推荐。但经得起推敲吗？有没有可能在自欺？感觉上没问题，但拿不出硬数据证明？

把结论拆成可验证的预测，拿外部真实数据逐条检验：查 API 返回、读代码实现、调两个 AI 模型交叉对质。预测被数据打脸的地方就是盲区。和费曼（破妄）审查产出物不同，和黑格尔（澄源）收敛认知不同，贝叶斯（叩实）验证的是结论本身。打脸越狠，认知增量越大。用事实冲击结论，而不是用逻辑自圆其说。每条预测标注验证结果：通过、部分通过、被推翻、无法验证。最终输出一份证据清单，让你清楚看到哪些结论站得住、哪些需要修正、哪些还悬着。

太虚五转第三转：叩实（验证）。用事实而非逻辑检验结论。没有外部事实冲击，就没有认知进步。

## 工作流概览（v4.0）

```
你的结论 → 拆成具体预测（"如果结论成立，那么 A/B/C 应该是这样"）
          → 用 API 查真实数据，看预测对不对
          → 用两个不同的 AI 模型独立解读原始资料，交叉验证
          → 汇总：哪些预测被数据打脸了？打脸的地方就是你需要重新思考的
```

四步走：

1. **拆预测**（Phase 1）— 把笼统结论拆成具体的、可查证的方向性预测。**每个核心断言必须同时拆出两个方向**：证伪预测（falsification_prediction，「如果结论有问题，我们应该看到 X」）和零假设预测（null_hypothesis_prediction，「如果结论大体正确，我们应该看到 Y」）。
2. **硬验证**（B1）— 调 API 查数据 / 跑 shell 命令查代码，用代码判断预测是否成立
3. **软验证**（B2）— 让 Claude 和 Qwen 各自独立解读原始资料/代码，看是否一致
4. **找盲区**（汇总）— 预测和实际不一致的地方 = 你的认知盲区

---

## 用之前说几句实话

1. **AI 审自己有天花板**：多个 AI 独立审查能提供一些交叉验证，但它们共享同一类训练数据，可能有共同盲区。大事还是找个真人看看。

2. **"没发现问题"不等于"没问题"**：只能说在我能查到的范围内没找到矛盾，不代表结论一定对。

3. **一次只验一个结论**：真实决策往往要比好几个方案。这里的输出只是参考之一，不是最终答案。

4. **概率是粗略的**：报告里的概率和误差范围是 AI 估的，有最低误差保护（±5pp 起），别当精确值看。

---

## 执行方式

本 skill 通过 Workflow script 执行（`scripts/workflow.js`），支持循环和并行 subagent。

**输入**：
```yaml
claim: string          # 必填。你的结论或判断（一句话）
thesis_path: string    # 可选。相关分析文档的路径
```

**输出**：验证报告（预测清单 + 数据验证结果 + 盲区清单），保存到对应目录下。

### 边界条件

| 场景 | 处理 |
|------|------|
| 命题属于 no_reference_class | 没有可类比的历史案例，提前终止，返回 NOT_APPLICABLE |
| thesis_path 不存在 | 直接基于你输入的结论文本继续 |
| B1 API 不可用 | 标记该条数据查不到，不算已验证 |
| B2 Idealab API 不可用 | 降级为同模型双视角验证，标注降级 |
| B2 源搜索失败 | 标注"原始资料获取失败"，该条计入未覆盖 |
| D2 区分力不足 | 预测太模糊无法验证，自动跳过 |
| D7 未覆盖率 >50% | 输出警告：大部分预测没验到，不能说"没问题" |

---

## 核心机制：预测 → 验证 → 找盲区

```
Phase 1                    B1                    B2                    汇总
拆预测                →   查数据             →   交叉验证           →   找盲区
把结论拆成具体预测      用 API 查真实数据       两个 AI 独立解读        预测 vs 实际
检查预测是否够具体      代码判断方向对不对       Claude vs Qwen         不一致 = 盲区
每个断言拆两个方向：
  证伪方向 + 零假设方向
```

### 七条设计原则（简版）

| # | 原则 | 白话 |
|---|------|------|
| D1 | 数据打脸才是进步 | 没有被数据反驳的预测不算深挖 |
| D2 | 预测必须够具体 | "可能涨也可能跌"这种预测不算数 |
| D3 | 数据源不让 AI 挑 | 查什么数据由代码控制，AI 不能挑对自己有利的 |
| D4 | 解释要用已知框架 | v4.0 待实现 |
| D5 | 大转弯由人类决策 | v4.0 待实现 |
| D6 | 发现可以存档复用 | v4.0 待实现 |
| D7 | 查不到的要说出来 | 超一半预测没验到 → 必须警告 |

### 验证维度

**金融场景：**

| 维度 | 验什么 | 数据从哪来 |
|------|--------|-----------|
| 宏观 | 行业趋势、政策方向、经济周期 | FRED、央行报告、BIS |
| 公司 | 财务数据、运营指标、业务管线 | SEC Filing、交易所公告 |
| 市场 | 价格走势、资金流向、波动率 | OpenD、期权链、融券数据 |

**代码场景：**

| 维度 | 验什么 | 数据从哪来 |
|------|--------|-----------|
| structure | 文件/函数/模块的结构事实 | wc -l, grep, git ls-tree, find |
| behavior | 运行时行为、测试结果、调用链 | test execution, grep 调用链, coverage |
| intent | 设计意图、变更原因、文档声明 | git blame, commit msg, SKILL.md |

### 双模型交叉验证（B2）

| 级别 | 配置 | 说明 |
|------|------|------|
| L1（降级） | 仅 Claude | 用两套不同提示词，同一模型两个视角 |
| **L2（当前）** | Claude + Qwen | 两个不同模型各自独立解读 |
| L3（扩展） | +Gemini | 三模型多数投票 |

---

## 与其他 Skill 的配合

| Skill | 它做什么 | 怎么配合 |
|-------|---------|---------|
| `feynman` | 认知纪律审查 | Feynman 发现证据不足的判断否决时，委派 Bayes 做定向深挖验证 |
| `hegel` | 迭代收敛管线 | hegel 管线在 S3（calibrate）和 S5（verify）步骤中调用 bayes，mode 参数由 hegel lens §4 配置。**独立调用时**使用 `references/lens-bayes.md` 提供领域适配 |
| `hv-analysis` | 横纵分析 | hv 产出分析结论，本 skill 深挖验证结论靠不靠谱 |
| `deep-research` | 深度调研 | 调研报告可作为 Bayes 的输入，Bayes 也会调用它查资料 |
| `evidence-chain` | 证据管理 | Bayes 找到的一手证据可以存入证据链 |
| `thesis-update` | 更新判断 | 验证后修正的概率可以回写 |

---

## 常见审查偏差（速查）

详见 [bias-checklist.md](references/bias-checklist.md)。

| 偏差 | 一句话解释 |
|------|-----------|
| 独立性假设 | 把相互关联的因素当成独立事件 |
| 时间错配 | 拿不同时间段的数据放一起比 |
| 循环论证 | A 证明 B、B 又证明 A |
| 锚定偏差 | 第一印象太强，后面怎么调都调不够 |
| 幸存者偏差 | 只看成功案例，忽略失败的 |
| 方向偏斜 | 所有修正都偏向同一个方向（可能在自欺） |

### 按不确定性类型的深挖角度

| 类型 | 深挖角度 | 白话 |
|------|---------|------|
| 确定性 | 因果链验证 | 你说的因果关系真的成立吗？ |
| 确定性 | 奥卡姆检验 | 有没有更简单的解释？ |
| 确定性 | 边界有效性 | 你假设的前提条件还成立吗？ |
| 信息不足 | 先验边界 | 搜索范围是不是太窄，漏掉了可能性？ |
| 信息不足 | 信息缺口 | 有没有能查到但你没查的关键信息？ |
| 信息不足 | 更新质量 | 证据的权重给得合理吗？ |
| 本质随机 | 遍历性检验 | 平均值能代表个体吗？有没有爆仓风险？ |
| 本质随机 | 不可约性 | 真的没法再查了，还是懒得查？ |
| 本质随机 | 尾部风险 | 极端情况被低估了吗？ |

---

## 理论基石

认识论纪律见 [theoretical-foundations.md](references/theoretical-foundations.md)。
深度生成机制见 [depth-engine-principles.md](references/depth-engine-principles.md)（v4.0 北极星）。

1. 初始判断是猜想，不是结论（Popper）
2. 区分硬核与保护带，优先检验硬核（Lakatos）
3. 从参照类别基准率出发（Tetlock）
4. 用条件概率替代独立性假设（Tetlock）
5. 修正全偏一个方向 = 退化信号（Lakatos）
6. 进一步研究不改变行动时停止（Good VOI）
7. 按不确定性类型选推理工具（Dual-Framework / 边界锚定+结构监测+自适应行动）
8. 集合平均≠时间平均，非遍历系统需 Kelly 而非期望值最大化（Peters）

---

## 常见踩坑（反模式）

| 坑 | 表现 | 怎么防 |
|----|------|--------|
| 假审查 | 审完发现"全是对的" | 检查是否所有修正都偏同一方向 |
| 单方向预测 | 所有预测都是证伪方向，零假设方向缺失 | Phase 1 每个核心断言必须同时拆出 falsification_prediction + null_hypothesis_prediction |
| 精度幻觉 | "概率是 16.3%" | 强制最少 ±5% 误差范围 |
| 锚定陷阱 | 第一印象只微调 | 用基准率重新校准 |
| 无限循环 | 每轮都找到新问题 | 设最大轮次安全阀 |
| 过早收工 | 第 1 轮就说"够了" | 至少跑 2 轮 |
| 发现问题不扩误差 | 找到问题但概率不变 | 代码强制：发现问题必须扩大误差范围 |
| 伪独立 | 5 个 AI 都说同一结论 | 报告里声明局限性，建议找人审 |

---

## 规格化桥接提示

> 💡 **规格化桥接提示**：验证通过的预测（prediction + verified=true）可被提取为 Success Criteria（如 "SC1. 当 X 条件成立时，Y 指标应在 Z 范围内"），用于后续 ce-plan/ce-brainstorm 规格化输入。

---

## 文件结构

```
bayes/
├── SKILL.md                    # 本文件
├── DESIGN.md                   # 设计方案
├── manifest.json
├── scripts/
│   ├── workflow.js             # v4.0 深度引擎（预测→测量→惊讶）
│   ├── workflow-v3.js          # v3.4 备份（对抗审查循环）
│   └── spike-v4.js             # v4.0 基础设施验证 spike
├── agents/
│   └── interface.yaml          # 输入输出接口定义
├── references/
│   ├── theoretical-foundations.md   # 认识论纪律
│   ├── depth-engine-principles.md  # v4.0 深度引擎设计原则（北极星）
│   └── bias-checklist.md           # 通用偏差清单（v3.4 遗产）
└── templates/
    └── report-template.md
```
