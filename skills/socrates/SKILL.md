---
name: socrates
display_name: "苏格拉底诘问（外审）"
description: >
  Argument audit (苏格拉底诘问): external claim quality review via fact-check + symmetry + independence.
  Use when user says "审查这个论点", "苏格拉底", "socrates", "这个分析靠谱吗", "看空观点审查".
  审查外部论点的质量（外审），与 feynman（内省自己的推理）互补。
version: "1.0.0"
visibility: public
last_updated: "2026-06-26"
kind: composed
triggers:
  - socrates
  - 苏格拉底
  - 诘问
  - 审查这个论点
  - 这个分析靠谱吗
  - 看空观点审查
  - bear case audit
  - argument audit
  - /socrates
metadata:
  author: "Antifragile Research Team"
  philosophy: "对手的论证也需要审查——事实错误和论证技巧比真正的风险更常见"
  origin: "康方生物 bear case 审查实战（2026-06-25），发现看空方的事实错误和论证技巧"
  risk: medium
  capabilities:
    - network
    - filesystem-write
  theoretical_basis:
    - "Socratic method: systematic questioning to expose contradictions"
    - "Principle of charity: interpret opponent's argument in strongest form before critique"
composition:
  final_output: audit_report
  steps:
    - id: route_check
      kind: llm_classify
      prompt: |
        判断用户输入的论点类型：
        - EXTERNAL: 外部论点（看空报告、第三方分析、反对意见、市场观点）
        - INTERNAL: 自己的推理（我的分析、我的结论、我的判断）
        - CONCLUSION: 自己的结论（需要验证的事实声明）
        
        输入: {{ input.argument_text }}
      choices: [EXTERNAL, INTERNAL, CONCLUSION]
      when: "{{ input.argument_text is defined }}"
      
    - id: route_feynman
      kind: gate
      prompt: |
        ⚠️ 检测到这是"自己的推理"，应该用 feynman（内省）而非 socrates（外审）。
        
        路由建议：/feynman {{ input.argument_text }}
        
        是否继续用 socrates 审查？（仅当论点虽是自己的但需要外审视角时）
      when: "{{ steps.route_check.output == 'INTERNAL' }}"
      on_failure: abort
      
    - id: route_bayes
      kind: gate
      prompt: |
        ⚠️ 检测到这是"自己的结论"，应该用 bayes（验证）而非 socrates（外审）。
        
        路由建议：/bayes {{ input.argument_text }}
        
        是否继续用 socrates 审查？（仅当结论来自外部但需要验证时）
      when: "{{ steps.route_check.output == 'CONCLUSION' }}"
      on_failure: abort
      
    - id: fact_check
      kind: skill
      skill: bayes
      args:
        claim: "{{ input.argument_text }}"
        mode: "fact_check"  # 仅做事实核查，不做预测分解
      depends_on: [route_check]
      when: "{{ steps.route_check.output == 'EXTERNAL' or steps.route_feynman.proceed == true or steps.route_bayes.proceed == true }}"
      soft_depends_on: [route_feynman, route_bayes]
      on_soft_fail: use_fallback
      fallback: { fact_findings: "事实核查跳过（bayes 不可用）" }
      
    - id: symmetry_check
      kind: llm
      prompt: |
        ## 对称性检查
        
        论点: {{ input.argument_text }}
        上下文: {{ input.context | default('无') }}
        
        检查这个批评是否同样适用于对照组/基准/替代方案：
        
        1. **对照组识别**: 这个论点隐含的对比基准是什么？
        2. **对称性测试**: 同样的批评逻辑是否也适用于基准？
        3. **论证技巧判定**: 如果批评对双方都适用但只攻击一方，这是论证技巧而非真实弱点
        
        输出格式：
        - 对照组: [基准]
        - 对称性: [对称/不对称]
        - 判定: [独立弱点/论证技巧/不适用]
      depends_on: [fact_check]
      soft_depends_on: [fact_check]
      on_soft_fail: use_fallback
      fallback: { symmetry_findings: "对称性检查跳过" }
      
    - id: independence_check
      kind: llm
      prompt: |
        ## 独立性检查
        
        论点: {{ input.argument_text }}
        事实核查结果: {{ steps.fact_check.output | default('无') }}
        对称性检查结果: {{ steps.symmetry_check.output | default('无') }}
        
        检查这条论点是否独立于其他论点：
        
        1. **前提依赖**: 这条论点是否依赖其他论点成立？
        2. **独立性测试**: 如果去掉这条论点，其他论点还成立吗？
        3. **链式脆弱性**: 如果这条被否定，是否会连带否定其他论点？
        
        输出格式：
        - 前提依赖: [无/依赖论点X]
        - 独立性: [独立/依赖]
        - 链式风险: [无/有]
      depends_on: [symmetry_check]
      soft_depends_on: [symmetry_check]
      on_soft_fail: use_fallback
      fallback: { independence_findings: "独立性检查跳过" }
      
    - id: quality_rating
      kind: llm
      prompt: |
        ## 论证质量综合评估
        
        论点: {{ input.argument_text }}
        事实核查: {{ steps.fact_check.output | default('无') }}
        对称性检查: {{ steps.symmetry_check.output | default('无') }}
        独立性检查: {{ steps.independence_check.output | default('无') }}
        
        综合三维度给出质量评级：
        
        | 维度 | 结果 | 权重 |
        |------|------|------|
        | 事实核查 | [准确/部分准确/错误] | 高 |
        | 对称性 | [独立弱点/论证技巧] | 中 |
        | 独立性 | [独立/依赖] | 低 |
        
        质量评级：
        - **高**: 事实准确 + 独立弱点 + 独立
        - **中**: 部分准确 或 依赖但核心成立
        - **低**: 事实错误 或 论证技巧 或 链式脆弱
        
        建议：
        - 保留: 质量高，纳入决策参考
        - 降级: 质量中，仅作为补充视角
        - 排除: 质量低，不纳入决策
        
        输出格式：
        - 质量评级: [高/中/低]
        - 建议: [保留/降级/排除]
        - 理由: [一句话总结]
      depends_on: [independence_check]
      soft_depends_on: [independence_check]
      on_soft_fail: use_fallback
      fallback: { quality_rating: "综合评估跳过" }
      
    - id: audit_report
      kind: llm
      prompt: |
        ## 苏格拉底诘问报告
        
        **论点**: {{ input.argument_text }}
        **来源**: {{ input.source | default('未指定') }}
        **审查时间**: {{ timestamp }}
        
        ### 三维度审查结果
        
        #### 1. 事实核查
        {{ steps.fact_check.output | default('跳过') }}
        
        #### 2. 对称性检查
        {{ steps.symmetry_check.output | default('跳过') }}
        
        #### 3. 独立性检查
        {{ steps.independence_check.output | default('跳过') }}
        
        ### 综合评估
        {{ steps.quality_rating.output | default('跳过') }}
        
        ### 与 thesis 交叉比对（投资 lens 专属）
        {% if input.thesis_path %}
        检查此论点是否已被 thesis 覆盖：
        - 已覆盖: [是/否]
        - 覆盖深度: [充分/不足/未覆盖]
        - 行动建议: [补充证据/更新 FC/无需行动]
        {% else %}
        （非投资场景，跳过 thesis 比对）
        {% endif %}
        
        ### 最终建议
        - 保留此论点作为决策参考？[是/否]
        - 需要进一步验证的维度: [事实/对称性/独立性/无]
      depends_on: [quality_rating]
      output_artifact: "docs/socrates-audits/{{ input.argument_slug }}-{{ date }}.md"
---

# Socrates 苏格拉底诘问（外审）

> *"The unexamined argument is not worth accepting."*
> — 改编自苏格拉底

## 概述

看空报告、第三方分析、市场观点——这些外部论点听起来有道理，但经得起推敲吗？

外部论点常包含两类问题：**事实错误**（数据引用错误、案例描述失真）和**论证技巧**（选择性对比、隐含假设不成立、对照组不匹配）。这两类问题比真正的风险更常见，也更难识别。

这个 skill 用苏格拉底诘问法的三维度审查外部论点：**事实核查**（论点中的事实声明准确吗？）、**对称性检查**（批评是否同样适用于对照组？）、**独立性检查**（去掉这条，其他论点还成立吗？）。每条论点给出质量评级（高/中/低）和建议（保留/降级/排除），输出审查报告。

## 边界：与太虚五转的分工

| Skill | 审查对象 | 方向 | 问什么 |
|-------|---------|------|--------|
| feynman | **我的推理/产出** | 内省 | 我哪里可能自欺？ |
| bayes | **我的结论** | 验证 | 结论经得起数据检验吗？ |
| **socrates** | **外部论点** | 外审 | 对手的论证可靠吗？ |
| debono | 被过度批判的命题 | 回溯 | 被否掉的东西有被忽略的价值吗？ |

### 边界保护

**socrates 的输入必须是外部论点**：
- ✅ 看空报告、卖方分析、媒体报道、市场观点
- ✅ 第三方的投资建议、行业分析、技术评估
- ❌ 自己的推理过程（→ 路由到 feynman）
- ❌ 自己的结论（→ 路由到 bayes）

如果检测到输入是"自己的推理"或"自己的结论"，skill 会提示路由到 feynman 或 bayes。

## 三维度审查流程

```
外部论点输入
    ↓
Route Check: 外部/内部/结论？
    ↓ (外部)
Step 1: 事实核查（调用 bayes mode:fact_check）
    ↓
Step 2: 对称性检查（对照组是否同样受限？）
    ↓
Step 3: 独立性检查（去掉这条，其他论点还成立吗？）
    ↓
Quality Rating: 高/中/低 + 保留/降级/排除
    ↓
Audit Report: 审查报告（可选：与 thesis 交叉比对）
```

### Step 1: 事实核查

**问什么**: 论点中的事实声明准确吗？

**方法**: 调用 bayes skill（mode: fact_check），仅做事实核查，不做预测分解。

**典型案例**:
- ❌ "康方生物仅中国数据" → 事实核查发现 HARMONi 有 38% 非中国患者
- ✅ "HARMONi-3 中期 PFS 未达显著性" → 事实核查确认

### Step 2: 对称性检查

**问什么**: 这个批评是否同样适用于对照组/基准？

**方法**: 
1. 识别隐含的对比基准
2. 测试同样的批评逻辑是否适用于基准
3. 如果批评对双方都适用但只攻击一方 → 论证技巧

**典型案例**:
- ❌ Brahmer 批评 HARMONi-6 人群特征（90% 男性、排除 75+ 岁）→ 对称性检查发现 K 药对照组同样受限
- ✅ "K 药在真实世界高龄患者中效果下降" → 对称性检查发现这是独立弱点

### Step 3: 独立性检查

**问什么**: 去掉这条论点，其他论点还成立吗？

**方法**:
1. 检查这条论点是否依赖其他论点
2. 测试去掉这条后，其他论点是否仍成立
3. 如果链式脆弱（这条被否定会连带否定其他）→ 标记风险

**典型案例**:
- ❌ "仅中国数据 → FDA 不会批准 → 商业化失败" → 独立性检查发现链式脆弱（FDA 已受理 BLA）
- ✅ "成本失控 + 品位下降" → 独立性检查确认独立于其他论点

## 投资 Lens 适配

投资场景下，socrates 可作为 W/M cadence 的对抗性扫描工具：

```
持仓 bear case 搜索
    ↓
socrates 论证质量审查
    ↓
与 thesis 交叉比对
    ↓
更新 FC 或补充证据
```

**调用示例**:
```bash
/socrates --argument "紫金矿业成本失控，品位从0.48%降至0.35%" \
          --source "雪球分析 2026-02-28" \
          --thesis-path "docs/portfolio/thesis/2899.HK/thesis.md"
```

## 使用示例

### 示例 1: 康方生物 bear case 审查

**输入**:
```
论点: "康方生物 HARMONi-6 仅中国患者，全球适用性存疑"
来源: Pharmaphorum 2026-06-24
上下文: 持仓 bear case 审查
```

**输出**:
```markdown
## 苏格拉底诘问报告

### 1. 事实核查
❌ **部分准确**: HARMONi-6 确为中国试验，但 HARMONi（全球 III 期）有 38% 非中国患者（165 例），
且 BLA 已获 FDA 受理（PDUFA 2026-11-14）。

### 2. 对称性检查
⚠️ **论证技巧**: Brahmer 批评 HARMONi-6 人群特征（90% 男性、排除 75+ 岁），
但 K 药对照组同样受限于相同入组标准。这是选择性攻击而非独立弱点。

### 3. 独立性检查
⚠️ **链式脆弱**: "仅中国数据 → FDA 不会批准 → 商业化失败" 的推理链在第一步就被否定
（FDA 已受理 BLA）。

### 综合评估
- 质量评级: **低**
- 建议: **排除**
- 理由: 事实部分错误 + 论证技巧 + 链式脆弱

### 与 thesis 交叉比对
- 已覆盖: 是（thesis §3.2 已讨论 HARMONi 全球试验）
- 覆盖深度: 充分
- 行动建议: 无需行动，但可补充 Brahmer 批评的对称性分析作为防御论据
```

## 触发词

- `socrates`
- `苏格拉底`
- `诘问`
- `审查这个论点`
- `这个分析靠谱吗`
- `看空观点审查`
- `bear case audit`
- `/socrates`

## 文件结构

```
socrates/
├── SKILL.md                    # 本文件
├── agents/
│   └── interface.yaml          # 输入输出接口
├── references/
│   ├── lens-investment.md      # 投资 lens 适配
│   └── socratic-method.md      # 苏格拉底诘问法理论基础
└── evals/
    └── akeso-bear-case.json    # 康方生物 bear case 审查案例
```

## 下一步迭代方向

1. **多论点并行审查**: 支持批量审查多个论点，生成综合报告
2. **论点图谱**: 构建论点间的依赖关系图，识别链式脆弱性
3. **自动 bear case 搜索**: 集成 WebSearch，自动搜索持仓的 bear case 并审查
