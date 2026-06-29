# Bayes Composed Skill — 设计方案 v4.0

> 2026-06-06 | 状态：v4.0-alpha（最小切面验证通过，code review 修复完成）

---

## 版本演进

| 版本 | 核心变更 | 日期 |
|------|---------|------|
| v3.0 | 初始 Workflow 实现（5 维度并行审查 + 迭代循环） | 2026-04 |
| v3.1 | 费曼审查修正（F1-F3：硬约束 + 复杂度路由 + JSON schema） | 2026-04 |
| v3.2 | 第二轮费曼审查修正（代码级 band 比较、去伪依赖等） | 2026-05 |
| v3.3 | 集成 Dual-Framework：不确定性三分类 → 类型特异性攻击维度 | 2026-05 |
| v3.4 | 重命名 popper → bayes | 2026-06 |
| **v4.0-alpha** | **深度引擎重写：预测→测量→惊讶循环，替代对抗审查循环** | 2026-06-06 |

---

## 一、v4.0 核心变革

### 诊断（为何放弃 v3.x）

v3.x 的核心问题经三视角诊断确认：**同一个 LLM 多想几遍取最后一个答案**，无外部事实冲击，收敛到训练分布众数 = 零 alpha。

| v3.x 问题 | v4.0 解法 |
|-----------|----------|
| 审查循环不引入新事实 | 预测→测量→惊讶循环（外部数据驱动） |
| 5 reviewer 伪独立 | 双 LLM 对抗（Claude + Qwen，不同基座） |
| 方向判定由 LLM 决定 | 代码级判定（`judgeSurprise` 覆盖 LLM 输出） |
| 源选择不受控 | D3 源隔离（白名单 + 代码控制查询） |
| 无覆盖率概念 | D7 分层覆盖率 + 低覆盖警告 |

### 架构对比

```
v3.x:  命题 → 对抗审查(LLM找缺陷) → 溯源(LLM搜索) → 概率修正 → 收敛
v4.0:  命题 → 提取预测(三维度) → B1硬验证(API) + B2软验证(双LLM) → 惊讶判定(代码) → 报告
```

---

## 二、v4.0 架构

### DAG 结构

```
Phase 1: Formalize         Phase B1: HardVerify       Phase B2: SoftVerify         汇总
┌────────────────┐         ┌──────────────────┐       ┌──────────────────────┐     ┌────────┐
│ 命题形式化     │         │ API 数值查询      │       │ pipeline(predictions)│     │ 惊讶   │
│ + 预测提取     │────────▶│ 代码判定方向      │──────▶│  Stage1: 源获取      │────▶│ 覆盖率 │
│ + D2 区分力    │         │ judgeSurprise覆盖 │       │  Stage2: 双读对抗    │     │ 报告   │
└────────────────┘         └──────────────────┘       │    A=Claude B=Qwen   │     └────────┘
                                                      │  代码比对三值        │
                                                      └──────────────────────┘
```

### 七条设计原则

| # | 原则 | 类型 | v4.0 操作化 |
|---|------|------|------------|
| D1 | 惊讶是唯一燃料 | 硬 | 无外部数据惊讶 → 不产出认知增量 |
| D2 | 预测必须有区分力 | 硬 | `checkDistinguishability()` 代码拒绝同向预测 |
| D3 | 源选择不经过 LLM | 硬 | 源获取 prompt 限定优先级（WebFetch > WebSearch > curl） |
| D4 | 解释用具名框架 | 软 | v4.0-alpha 未实现 |
| D5 | 跃迁由人类决策 | 软 | v4.0-alpha 未实现 |
| D6 | 惊讶可持久化 | 硬 | v4.0-alpha 未实现 |
| D7 | 低覆盖率不沉默 | 硬 | `uncovered > 50%` 触发代码警告 |

### 代码级硬约束

```js
// D2: 区分力校验
if (if_thesis_correct.direction === if_thesis_wrong.direction) → 拒绝

// W7: B1 surprise 代码覆盖
for (const r of b1Results.results) {
  r.surprise = judgeSurprise(r.predicted_direction, r.actual_direction)
}

// W1: judgeSurprise 对 neutral/ambiguous 返回 false
function judgeSurprise(predicted, actual) {
  if (actual === 'unavailable' || actual === 'neutral' || actual === 'ambiguous') return false
  return predicted !== actual
}
```

---

## 三、B2 双读对抗设计

### 对称性保证

| 层面 | Agent A (Claude) | Agent B (Qwen) | 对称性 |
|------|-----------------|----------------|--------|
| 信息输入 | `truncateSource(sourceText)` | 同一 `truncateSource(sourceText)` via 文件 | ✅ 相同 |
| 系统提示 | 方向解读 + 源质量评估 | 同一任务（JSON 格式） | ✅ 等效 |
| 输出格式 | DIRECTION_SCHEMA | 同一 schema | ✅ 相同 |
| 通道隔离 | workflow subagent | idealab_client.py → Qwen API | ✅ 不同基座 |

### Agreement 判定（4 分支）

```
A=ambiguous && B=ambiguous → insufficient_evidence (surprise=false)
A=ambiguous XOR B=ambiguous → single_agent_supporting/opposing
A === B                     → consistent_supporting/opposing
A !== B                     → divergent (surprise=false, alpha 候选)
```

### 源传递安全

Agent B 通过**临时文件**传递源文档（`/tmp/bayes_b2_${idx}_prompt.txt`），而非 CLI 参数拼接。消除 shell 注入风险 + 避免 pipeline 并行时文件名冲突。

---

## 四、端到端测试结果（2026-06-06）

### 测试配置

| 参数 | 值 |
|------|---|
| 命题 | 康方生物(9926.HK) 30个月3倍概率 |
| thesis_path | `docs/portfolio/current_holdings/9926.HK_康方生物/thesis.md` |
| Agent 总数 | 19 |
| Token 消耗 | 952K (subagent) |
| 运行时间 | ~87 分钟 |

### 核心指标

| 指标 | 结果 |
|------|------|
| 预测提取数 | 10 有效 / 0 被 D2 拒绝 |
| B1 硬验证 | 5 个（3 surprise, 1 neutral, 1 unavailable） |
| B2 软验证 | 5 个（3 surprise, 1 divergent, 1 supporting） |
| 总 surprise | 6/10（60%），全部负面方向 |
| 覆盖率 | 硬 40% / 软 50% / 未覆盖 10% |
| Verdict | SURPRISES_FOUND |

### 三个验证问题

| 问题 | 回答 |
|------|------|
| 预测提取质量如何？ | 合格。10 因子覆盖三维度，粒度足够（含具体阈值），5 个前提审计 non-trivial |
| 硬验证命中率？ | 3/5 = 60% surprise（Summit 现金不足、板块流动性萎缩、亏损扩大） |
| 软验证分歧率？ | 1/5 = 20%（竞品进展：A 看 SSGJ-707 近期，B 看 BNT327 远期） |

### 最有价值发现

HARMONi-3 试验已于 2025-10 拆分为鳞癌/非鳞癌独立队列，thesis 定义的「全人群 PFS HR 统一读出」已不存在。这是 v3.x 无法发现的——需要外部事实冲击。

---

## 五、Code Review 修复记录（2026-06-06）

| # | 严重度 | 问题 | 修复 |
|---|--------|------|------|
| W1 | P1 | neutral 被当 opposing 触发虚假 surprise | `judgeSurprise` 对 neutral/ambiguous 返回 false；agreement 逻辑重写为 4 分支 |
| W3 | P1 | Agent A/B 信息不对称（A 全文，B 截断 1500） | `truncateSource()` 对称截断至 3000 字符 |
| W7 | P2 | B1 surprise 委托 LLM 无代码校验 | B1 返回后 `r.surprise = judgeSurprise(...)` 覆盖 |
| W2 | P2 | sourceText shell 注入风险 | 改为临时文件 + `--user-file` |
| W4 | P2 | `judgeSurprise` 死代码 | 激活为 B1+B2 共用的代码级判定函数 |
| W5 | P2 | curl fallback 基于错误 spike 结论 | 改为 WebFetch > WebSearch > curl 优先级 |
| W6 | Low | 覆盖率互斥无断言 | 添加 `coverageSum > totalPredictions` 警告 |
| Race | P2 | 同维度预测文件名冲突 | 用 pipeline index 命名 `bayes_b2_${idx}_prompt.txt` |

---

## 六、输入/输出接口

### 输入

```yaml
claim: string       # 必填。概率命题或描述
thesis_path: string # 可选。标的 thesis.md 路径
```

### 输出

```yaml
verdict: "SURPRISES_FOUND" | "NO_SURPRISE" | "NOT_APPLICABLE"
formalized: object  # 命题形式化结果
predictions: object # valid + rejected + premise_audits
b1: object          # B1 硬验证结果
b2: array           # B2 软验证结果
coverage: object    # hard/soft/uncovered rates + d7_warning
report: string      # markdown 报告
```

---

## 七、资源边界

| 维度 | 实测（康方案例） | 估算（简单命题） |
|------|----------------|-----------------|
| Agent 总数 | 19 | 8-12 |
| Token（subagent） | 952K | 300-500K |
| 运行时间 | ~87 min | ~30-45 min |
| 瓶颈 | B2 源获取（WebFetch 多轮）| 同上 |

---

## 八、已知局限

1. **伪独立性**：Agent A (Claude) 与 Agent B (Qwen) 在训练数据和推理框架上可能存在系统性重叠，双读一致不等于事实为真
2. **硬验证零 alpha**：API 数据（财报、股价）是已被市场定价的信息，硬惊讶可能是滞后信号
3. **源获取质量**：B2 依赖 web 搜索质量，时效性和完整性不可保证
4. **单命题局限**：不做跨标的比较决策
5. **前提审计人工**：5 个 unverified 前提需人类验证，系统无法自动完成
6. **解释层/决策层缺失**：v4.0-alpha 不输出 Lakatos 形式化判据和行动建议

---

## 九、下一步

1. [x] depth-engine-principles v1.2 定稿
2. [x] Spike 验证三条基础设施通路
3. [x] idealab_client.py 实现
4. [x] workflow.js v4.0 重写
5. [x] 康方"三年三倍"端到端测试
6. [x] Code review + 修复 W1-W7
7. [ ] 解释层（D4）：Lakatos 退化/进步判据形式化
8. [ ] 持久化层（D6）：surprise-archive.json
9. [ ] 第二个标的测试验证泛化性
10. [ ] v4.0-beta 发布（修复验证通过后）

---

## 附录：v3.x 设计（历史参考）

> v3.4 workflow 保留在 `scripts/workflow-v3.js`。
> v3.x 设计文档的完整内容见 git history（commit before v4.0 rewrite）。

### v3.x 核心 DAG（已废弃）

```
Phase 1 (formalize) → Phase 2 (5-reviewer adversarial) → Phase 3 (ground) → Phase 4 (decide)
                                    ↑                                              │
                                    └──────── CONTINUE loop (max 3 rounds) ────────┘
```

v3.x 的 Dual-Framework 不确定性分类（deterministic/epistemic/ontological/mixed）在 v4.0 中保留为 Phase 1 的 `uncertainty_type` 字段，但不再驱动攻击维度选择——因为 v4.0 不使用"攻击"范式。
