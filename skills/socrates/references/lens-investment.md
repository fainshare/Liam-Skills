# Investment Lens for Socrates

## 适用场景

| 场景 | 输入 | 输出 |
|------|------|------|
| **W cadence 对抗性扫描** | 持仓标的的 bear case 报告 | 论证质量评估 + thesis 交叉比对 |
| **M decision 审查** | 拟加仓/减仓标的的看空分析 | 保留/降级/排除建议 |
| **thesis 更新前审查** | 第三方分析（卖方报告、媒体报道） | 事实准确性 + 与 thesis 覆盖度比对 |

## 投资场景特化流程

```
Step 0: 搜索 bear case（可选前置步骤）
    ↓
Step 1-3: 三维度审查（通用流程）
    ↓
Step 4: 与 thesis 交叉比对（投资专属）
    ↓
Step 5: 更新 FC 或补充证据（行动建议）
```

## Step 0: Bear Case 搜索（可选）

如果用户未提供具体论点，可先搜索持仓的 bear case：

**搜索策略**:
1. 搜索关键词: `"{公司名} 风险"`, `"{公司名} 看空"`, `"{公司名} bear case"`
2. 数据源: 雪球、东方财富、Seeking Alpha、Bloomberg、Pharmaphorum（生物医药）
3. 时间窗口: 最近 30 天
4. 筛选: 选择 3-5 条最具代表性的看空论点

**搜索示例**:
```bash
/socrates --search-bear-case --symbol 9926.HK --thesis-path "docs/portfolio/thesis/9926.HK/thesis.md"
```

## Step 4: 与 Thesis 交叉比对

**检查维度**:

| 维度 | 问题 | 行动 |
|------|------|------|
| **已覆盖** | thesis 是否已讨论此论点？ | 是 → 检查覆盖深度；否 → 标记为"盲区" |
| **覆盖深度** | thesis 的讨论是否充分？ | 充分 → 无需行动；不足 → 补充证据 |
| **FC 影响** | 此论点是否影响现有 FC？ | 是 → 考虑更新 FC；否 → 仅作为防御论据 |

**Thesis 结构参考**:
```markdown
## thesis.md 关键章节
- §2 Core Thesis（核心论点）
- §3 Evidence（证据链）
- §4 FC / Belief（关键判断）
- §5 Risks（风险清单）
```

**交叉比对输出**:
```markdown
### 与 thesis 交叉比对

**论点**: "康方生物 HARMONi-6 仅中国患者，全球适用性存疑"

**已覆盖**: 是
- thesis §3.2 已讨论 HARMONi 全球试验（165 例非中国患者）
- thesis §5.1 已列出"全球适用性"风险，但标记为"低"

**覆盖深度**: 充分
- thesis 已引用 HARMONi 数据（38% 非中国患者，OS 一致性）
- thesis 已讨论 FDA BLA 受理（PDUFA 2026-11-14）

**FC 影响**: 无
- FC-012 "全球商业化可行性" 信念度 0.70，无需调整
- 但可补充 Brahmer 批评的对称性分析作为防御论据

**行动建议**: 无需行动，但建议在 thesis §5.1 添加注释：
"Brahmer 批评（人群特征）对 K 药对照组同样适用，属于论证技巧而非独立弱点"
```

## Step 5: 更新 FC 或补充证据

**决策矩阵**:

| 质量评级 | 已覆盖？ | 行动 |
|---------|---------|------|
| 高 | 否 | **补充证据**: 添加到 thesis §3 Evidence |
| 高 | 是（不足） | **深化讨论**: 扩展 thesis 相关章节 |
| 高 | 是（充分） | **无需行动**: 确认 thesis 覆盖度 |
| 中 | 否 | **标记盲区**: 添加到 thesis §5 Risks（低优先级） |
| 中 | 是 | **无需行动**: 现有覆盖已足够 |
| 低 | 任意 | **排除**: 不纳入 thesis，但记录审查过程 |

**更新 FC 的条件**:
- 质量评级 = 高
- 论点直接影响现有 FC 的核心假设
- thesis 当前覆盖不足

**更新示例**:
```markdown
## FC-012: 全球商业化可行性

**信念度**: 0.70 → 0.65（下调）

**更新理由**: 
高质量 bear case 指出 HARMONi-3 中期 PFS 未达显著性（事实核查确认），
这可能延迟 FDA 批准时间表。虽然 BLA 已受理，但中期数据不足可能影响最终审批。

**证据补充**:
- HARMONi-3 中期分析 PFS p-value 未达预设阈值（来源：Pharmaphorum 2026-06-24）
- 但 OS 数据仍在成熟中，最终分析可能改善

**防御论据**:
- Brahmer 批评（人群特征）对 K 药对照组同样适用（对称性检查确认）
- Summit 已搭建美国+欧洲商业化团队（独立性检查确认）
```

## 投资场景特殊检查

### 1. 数据来源可信度

| 来源类型 | 可信度 | 事实核查深度 |
|---------|--------|-------------|
| 学术期刊（Lancet、NEJM） | 高 | 仅核查引用准确性 |
| 官方公告（FDA、交易所） | 高 | 仅核查引用准确性 |
| 卖方报告（投行研究） | 中 | 核查数据来源 + 利益冲突 |
| 财经媒体（Bloomberg、FT） | 中 | 核查数据来源 + 匿名信源 |
| 社交媒体（雪球、Seeking Alpha） | 低 | 全面核查 |

### 2. 利益冲突检查

**检查清单**:
- 作者是否持有空头仓位？
- 发布机构是否有做空业务？
- 论点发布时间是否与股价异动相关？
- 是否存在选择性引用（只引用支持看空的数据）？

### 3. 市场情绪对照

**检查维度**:
- 论点发布前后股价反应（过度反应 = 可能是情绪驱动）
- 期权市场隐含波动率变化（IV 飙升 = 市场认真对待）
- 其他分析师的跟进/反驳（共识 vs 异见）

## 调用示例

### 示例 1: W cadence 对抗性扫描

```bash
# 每周对持仓 Top 3 做 bear case 审查
/socrates --search-bear-case --symbol 9926.HK --thesis-path "docs/portfolio/thesis/9926.HK/thesis.md"
/socrates --search-bear-case --symbol 2899.HK --thesis-path "docs/portfolio/thesis/2899.HK/thesis.md"
/socrates --search-bear-case --symbol 9992.HK --thesis-path "docs/portfolio/thesis/9992.HK/thesis.md"
```

### 示例 2: M decision 审查

```bash
# 拟加仓康方生物，审查看空分析
/socrates --argument "康方生物依沃西单抗全球适用性存疑，FDA 不会批准" \
          --source "Pharmaphorum 2026-06-24" \
          --thesis-path "docs/portfolio/thesis/9926.HK/thesis.md" \
          --context "拟在 80 HKD 加仓 5000 股"
```

### 示例 3: Thesis 更新前审查

```bash
# 更新紫金矿业 thesis 前，审查第三方分析
/socrates --argument "紫金矿业成本失控，矿产金成本同比+15%，品位从0.48%降至0.35%" \
          --source "东方财富财富号 2026-02-28" \
          --thesis-path "docs/portfolio/thesis/2899.HK/thesis.md"
```

## 与 weekly-review 集成

在 `weekly-review` skill 中添加对抗性扫描步骤：

```yaml
# weekly-review composition 片段
- id: adversarial_scan
  kind: parallel
  parallel:
    - socrates_scan_1
    - socrates_scan_2
    - socrates_scan_3
  when: "{{ input.adversarial_mode == true }}"

- id: socrates_scan_1
  kind: skill
  skill: socrates
  args:
    argument_text: "{{ steps.bear_case_search_1.output }}"
    source: "bear case 搜索"
    thesis_path: "{{ input.top_holdings[0].thesis_path }}"
  depends_on: [bear_case_search_1]
  soft_depends_on: [bear_case_search_1]
  on_soft_fail: skip

# 类似 socrates_scan_2, socrates_scan_3...
```

## 输出示例

见 `evals/akeso-bear-case.json`（康方生物 bear case 审查完整案例）。
