export const meta = {
  name: 'bayes',
  description: '迭代深挖——找缺陷 → 一手源验证 → 修正循环，深挖到足够有信服力的洞见',
  phases: [
    { title: 'Formalize', detail: 'Phase 1: 命题形成 + 不确定性分类 + 复杂度分级' },
    { title: 'Adversary', detail: 'Phase 2: 对抗审查（通用偏差 + 类型特异性攻击）' },
    { title: 'Ground', detail: 'Phase 3: 物质性缺陷溯源' },
    { title: 'Decide', detail: 'Phase 4: 停止判断（含硬约束）' },
    { title: 'Report', detail: '最终报告生成' },
  ],
}

// ============================================================
// Structured Output Schemas
// ============================================================

const FORMALIZE_SCHEMA = {
  type: 'object',
  properties: {
    proposition: {
      type: 'object',
      properties: {
        precise_statement: { type: 'string' },
        problem_type: { type: 'string', enum: ['has_reference_class', 'weak_reference_class', 'no_reference_class'] },
        time_window: { type: 'string' }
      },
      required: ['precise_statement', 'problem_type', 'time_window']
    },
    decision_function: {
      type: 'object',
      properties: {
        action_up_threshold: { type: 'number' },
        action_up_label: { type: 'string' },
        action_down_threshold: { type: 'number' },
        action_down_label: { type: 'string' }
      },
      required: ['action_up_threshold', 'action_up_label', 'action_down_threshold', 'action_down_label']
    },
    reference_class: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        base_rate_pct: { type: 'number' },
        source: { type: 'string' }
      },
      required: ['description', 'base_rate_pct', 'source']
    },
    factors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['hard_core', 'protective_belt'] },
          initial_estimate_pct: { type: 'number' },
          dependencies: { type: 'string' }
        },
        required: ['name', 'type', 'initial_estimate_pct']
      }
    },
    complexity: {
      type: 'object',
      properties: {
        factor_count: { type: 'number' },
        coupling: { type: 'string', enum: ['low', 'medium', 'high'] },
        coupling_coefficient: { type: 'number' },
        complexity_score: { type: 'number' },
        recommended_path: { type: 'string', enum: ['FULL', 'LITE'] }
      },
      required: ['factor_count', 'coupling', 'coupling_coefficient', 'complexity_score', 'recommended_path']
    },
    uncertainty: {
      type: 'object',
      properties: {
        uncertainty_type: { type: 'string', enum: ['deterministic', 'epistemic', 'ontological', 'mixed'] },
        stability_assessment: { type: 'string' },
        regime_change_signals: { type: 'array', items: { type: 'string' } },
        reducible_component: { type: 'string' }
      },
      required: ['uncertainty_type', 'stability_assessment', 'regime_change_signals']
    },
    implicit_assumptions: {
      type: 'array',
      items: { type: 'string' }
    },
    initial_probabilities: {
      type: 'object',
      properties: {
        ge_1x: { type: 'number' },
        ge_2x: { type: 'number' },
        ge_3x: { type: 'number' },
        ge_4x: { type: 'number' }
      },
      required: ['ge_1x', 'ge_2x', 'ge_3x', 'ge_4x']
    }
  },
  required: ['proposition', 'decision_function', 'reference_class', 'factors', 'complexity', 'uncertainty', 'implicit_assumptions', 'initial_probabilities']
}

const DIRECTION_META_SCHEMA = {
  type: 'object',
  properties: {
    material_defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          source_reviewer: { type: 'string' },
          direction: { type: 'string', enum: ['up', 'down', 'neutral'] },
          impact_pp: { type: 'number' },
          crosses_boundary: { type: 'boolean' }
        },
        required: ['id', 'description', 'direction', 'impact_pp', 'crosses_boundary']
      }
    },
    has_material_defects: { type: 'boolean' },
    total_corrections: { type: 'number' },
    direction_stats: {
      type: 'object',
      properties: {
        optimistic: { type: 'number' },
        pessimistic: { type: 'number' },
        neutral: { type: 'number' }
      },
      required: ['optimistic', 'pessimistic', 'neutral']
    },
    skew_ratio: { type: 'number' },
    degradation_alert: { type: 'boolean' },
    lakatos_verdict: { type: 'string', enum: ['progressive', 'degenerative', 'mixed'] },
    recommendation: { type: 'string', enum: ['PROCEED_TO_GROUND', 'NO_MATERIAL_DEFECTS'] }
  },
  required: ['material_defects', 'has_material_defects', 'direction_stats', 'skew_ratio', 'degradation_alert', 'lakatos_verdict', 'recommendation']
}

const DECIDE_SCHEMA = {
  type: 'object',
  properties: {
    probabilities: {
      type: 'object',
      properties: {
        ge_1x: { type: 'object', properties: { estimate: { type: 'number' }, error_band: { type: 'number' } }, required: ['estimate', 'error_band'] },
        ge_2x: { type: 'object', properties: { estimate: { type: 'number' }, error_band: { type: 'number' } }, required: ['estimate', 'error_band'] },
        ge_3x: { type: 'object', properties: { estimate: { type: 'number' }, error_band: { type: 'number' } }, required: ['estimate', 'error_band'] },
        ge_4x: { type: 'object', properties: { estimate: { type: 'number' }, error_band: { type: 'number' } }, required: ['estimate', 'error_band'] }
      },
      required: ['ge_1x', 'ge_2x', 'ge_3x', 'ge_4x']
    },
    all_bands_in_one_zone: { type: 'boolean' },
    reasoning: { type: 'string' }
  },
  required: ['probabilities', 'all_bands_in_one_zone', 'reasoning']
}

// ============================================================
// Bias Dimensions — 通用偏差（适用于所有不确定性类型）
// ============================================================

const BIAS_DIMS_UNIVERSAL = [
  { key: 'independence', name: '独立性假设', check: '子因子之间是否被错误当作独立事件？画因果图，寻找 confounders 和级联效应。用条件概率替代：P(B|A成功) vs P(B|A失败)' },
  { key: 'time-mismatch', name: '时间错配', check: '数据点是否属于同一时间维度？峰值指标搭配当前倍数？参照的可比公司处于不同发展阶段？' },
  { key: 'circular', name: '循环论证', check: '证据链中是否存在自引用？"多份报告支持"是否源自同一原始数据？' },
  { key: 'anchoring', name: '锚定偏差', check: '初始估计是否过度影响后续调整？从0%反向估计会得到同样结果吗？用参照类别基准率交叉验证。' },
  { key: 'survivorship', name: '幸存者偏差', check: '参照案例是否只包含成功案例？失败案例被忽略了吗？成功率基准是多少？' },
]

// ============================================================
// Attack Dimensions — 按不确定性类型差异化（Dual-Framework）
// ============================================================

const ATTACK_DIMS_BY_TYPE = {
  deterministic: [
    { key: 'causal-chain', name: '因果链验证', check: '第一性原理推导是否完整？每步因果是否有实证支撑？有无混淆相关与因果？是否存在遗漏的中间变量？' },
    { key: 'occam', name: '奥卡姆检验', check: '是否存在更简模型能解释同样观察？当前模型是否引入了不必要的实体/假设？复杂模型的额外预测力是否经过验证？' },
    { key: 'boundary-validity', name: '边界有效性', check: '系统被判定为"稳定"的依据是否可靠？有无跃迁信号被忽视？稳定性假设的时间窗口是否匹配命题时间窗口？' },
  ],
  epistemic: [
    { key: 'prior-bounds', name: '先验边界', check: '有界贝叶斯的边界设得合理吗？搜索空间是否太窄排除了真实假设？先验来源的质量和时效性如何？' },
    { key: 'info-gap', name: '信息缺口', check: '有哪些可获取但未获取的信息可以大幅缩窄不确定性？当前是在用推测替代调查吗？"不确定"是否其实是"没去查"？' },
    { key: 'update-quality', name: '更新质量', check: '新证据的权重是否合理？是否存在过度更新（单一数据点翻转信念）或更新不足（忽视强信号）？证据的独立性如何？' },
  ],
  ontological: [
    { key: 'ergodicity', name: '遍历性检验', check: '是否混淆了集合平均与时间平均？个体轨迹是否可能与大数定律预测大幅偏离？有无破产路径使期望值计算失去意义？' },
    { key: 'irreducibility', name: '不可约性', check: '不确定性是否真的不可约？还是被错误归类为本体论不确定（实际是信息不足导致的懒惰归类）？有无可获取的信息能降维？' },
    { key: 'tail-risk', name: '尾部风险', check: '概率分布的尾部是否被低估？误差带是否只覆盖正态范围而忽略肥尾？存在黑天鹅路径吗？极端事件的条件概率是否被评估？' },
  ],
}

// ============================================================
// Helper: 按不确定性类型获取攻击维度
// ============================================================
function getTypeDims(uncertaintyType) {
  if (uncertaintyType === 'mixed') {
    return [...ATTACK_DIMS_BY_TYPE.epistemic, ATTACK_DIMS_BY_TYPE.ontological.find(d => d.key === 'irreducibility')]
  }
  return ATTACK_DIMS_BY_TYPE[uncertaintyType] || ATTACK_DIMS_BY_TYPE.epistemic
}

// ============================================================
// Helper: 代码计算误差带是否扩大
// ============================================================
function errorBandWidened(currentProbs, prevProbs) {
  if (!prevProbs) return false
  const keys = ['ge_1x', 'ge_2x', 'ge_3x', 'ge_4x']
  const currentAvg = keys.reduce((sum, k) => sum + currentProbs[k].error_band, 0) / 4
  const prevAvg = keys.reduce((sum, k) => sum + prevProbs[k].error_band, 0) / 4
  return currentAvg > prevAvg
}

// ============================================================
// Helper: 精简 history 用于传入 prompt
// ============================================================
function summarizeHistory(history) {
  return history.map(h => ({
    round: h.round,
    defects_count: h.meta.material_defects.length,
    skew_ratio: h.meta.skew_ratio,
    lakatos: h.meta.lakatos_verdict,
    degradation: h.meta.degradation_alert,
    probabilities: h.decision.probabilities,
    verdict: h.verdict
  }))
}

// ============================================================
// Phase 1: 命题形成 + 不确定性分类 + 复杂度分级
// ============================================================
phase('Formalize')
const formalized = await agent(`
你是命题深挖的准备阶段执行者。

用户输入：${args.claim}
相关文件（如有）：${args.source_file || '无'}

你的任务是将用户输入转化为精确的可验证命题，评估不确定性类型和复杂度。

要求：
1. 精确命题必须有：主体、时间窗口、可测量阈值
2. 拒绝模糊命题（"前景如何"），只接受"P(X ≥ Nx in T) = ?"形式
3. 如果问题类型为 no_reference_class，在 precise_statement 中说明不适用本方法
4. 决策函数：定义什么概率值会改变你的行动
5. 参照类别：找同类事件的历史基础概率
6. 因子分解：3-8个子因子，标注类型和依赖关系
7. 复杂度评估：
   - coupling 判定标准：low=因子间无显著依赖 / medium=部分条件依赖 / high=多数强耦合
   - coupling_coefficient: low=1.0, medium=1.5, high=2.0
   - complexity_score = factor_count × coupling_coefficient
   - recommended_path: score >= 6.0 → FULL, score < 6.0 → LITE
8. 不确定性分类（Dual-Framework，这是核心）：
   - 判断系统结构是否稳定：因果关系是否确定、过去规律是否仍适用
   - 稳定 → deterministic：因果链可追溯，适用第一性原理推导
   - 不稳定 → 区分两种不确定性：
     * epistemic（认识论）：信息不足但可补。有可获取的数据/证据能缩窄分布
     * ontological（本体论）：本质随机，不可通过信息补充消除。集合平均≠时间平均
   - 如果两种并存 → mixed：标注哪部分可约（reducible_component）、哪部分不可约
   - regime_change_signals：列出什么信号出现说明你对系统稳定性的判断错了
   - 判定标准举例：
     * "毛利率>40%时ROE>15%" → deterministic（会计恒等式）
     * "III期临床成功" → epistemic（可通过前期数据缩窄）
     * "下月股价涨跌" → ontological（市场微观结构不可预测）
     * "三年三倍" → mixed（管线进展=epistemic，市场估值=ontological）
9. 初始概率基于基准率调整，不凭直觉

如需读取 source_file，先完整阅读再分析。
严格按 JSON schema 输出。
`, { label: 'formalize', phase: 'Formalize', schema: FORMALIZE_SCHEMA })

// 代码判断路由
const isFullPath = formalized.complexity.complexity_score >= 6.0 || (args.force_full === true)
const mode = isFullPath ? 'FULL' : 'LITE'
const uType = formalized.uncertainty.uncertainty_type
log(`命题形成完成 | 复杂度分=${formalized.complexity.complexity_score} | 路径=${mode} | 不确定性=${uType}`)

// 构建人类可读的命题摘要
const propositionSummary = `
命题：${formalized.proposition.precise_statement}
时间窗：${formalized.proposition.time_window}
问题类型：${formalized.proposition.problem_type}
不确定性类型：${uType}（${formalized.uncertainty.stability_assessment}）${uType === 'mixed' ? `\n可约部分：${formalized.uncertainty.reducible_component || '未指定'}` : ''}
决策边界：P > ${formalized.decision_function.action_up_threshold}% → ${formalized.decision_function.action_up_label}; P < ${formalized.decision_function.action_down_threshold}% → ${formalized.decision_function.action_down_label}
参照类别：${formalized.reference_class.description}（基准率 ${formalized.reference_class.base_rate_pct}%）
因子：${formalized.factors.map(f => `${f.name}(${f.type}, ${f.initial_estimate_pct}%)`).join(' / ')}
初始估计：P(≥1x)=${formalized.initial_probabilities.ge_1x}%, P(≥2x)=${formalized.initial_probabilities.ge_2x}%, P(≥3x)=${formalized.initial_probabilities.ge_3x}%, P(≥4x)=${formalized.initial_probabilities.ge_4x}%
隐含假设：${formalized.implicit_assumptions.join('; ')}
跃迁信号：${formalized.uncertainty.regime_change_signals.join('; ')}
`.trim()

// 不适用本方法的提前终止
if (formalized.proposition.problem_type === 'no_reference_class') {
  log('终止：无参照类别，本方法不适用')
  return { verdict: 'NOT_APPLICABLE', rounds: 0, mode, report: '命题属于无参照类别，不适用本方法。建议转为情景分析。', history: [] }
}

// ============================================================
// Gate: Phase 1 确认检查点
// ============================================================
log(`\n📋 命题形成完成，请确认：\n${propositionSummary}\n`)

// phase_1_only 模式：仅返回形式化结果供用户确认，不进入审查循环
if (args.phase_1_only === true) {
  log('Gate: phase_1_only=true，返回形式化结果待确认')
  return { verdict: 'PENDING_CONFIRM', rounds: 0, mode, uncertainty_type: uType, formalized, propositionSummary }
}

// ============================================================
// 审查循环
// ============================================================
const maxRounds = args.max_rounds || 3
let round = 0
let verdict = 'CONTINUE'
const history = []
const typeDims = getTypeDims(uType)

while (verdict === 'CONTINUE' && round < maxRounds) {
  round++
  log(`=== 第 ${round}/${maxRounds} 轮审查 ===`)

  // --- Phase 2: 对抗审查 ---
  phase('Adversary')

  const historyBrief = history.length > 0
    ? `历史审查记录：\n${JSON.stringify(summarizeHistory(history), null, 2)}`
    : ''

  let reviews
  if (mode === 'FULL') {
    // FULL 路径：通用偏差维度 + 类型特异性攻击维度
    const allDims = [...BIAS_DIMS_UNIVERSAL, ...typeDims]
    reviews = await parallel(allDims.map(dim => () =>
      agent(`
你是「${dim.name}」审查员。你的唯一任务是从这个维度攻击命题。

命题摘要：
${propositionSummary}

${historyBrief}

检查要点：${dim.check}

输出要求：
对每个发现的缺陷（0-3个），输出：
- 缺陷描述：一句话
- 修正方向：up(乐观修正) / down(悲观修正) / neutral(方向不确定)
- 估计影响：±X pp
- 物质性判断：是否可能跨越决策边界（P>${formalized.decision_function.action_up_threshold}% 或 P<${formalized.decision_function.action_down_threshold}%）

如果未发现缺陷，声明"本维度无物质性发现"并说明检查了什么。
`, { label: `reviewer:${dim.key}:R${round}`, phase: 'Adversary' })
    ))
  } else {
    // LITE 路径：Devil's Advocate + Bias Hunter + 1 个类型特异性 reviewer
    const primaryTypeDim = typeDims[0]
    reviews = await parallel([
      () => agent(`
你是 Devil's Advocate。论证命题为假。
站在空头立场，找最强利空、被忽略的风险、过度乐观的假设。

命题摘要：
${propositionSummary}

${historyBrief}

输出：缺陷清单（至少 2 个），每个含：
- 描述、方向(down)、影响(±pp)、是否跨越决策边界(P>${formalized.decision_function.action_up_threshold}% 或 <${formalized.decision_function.action_down_threshold}%)
`, { label: `reviewer:devil:R${round}`, phase: 'Adversary' }),
      () => agent(`
你是 Confirmation Bias Hunter。检测锚定和确认偏差。

方法：
1. 忽略初始估计，纯用参照类别基准率(${formalized.reference_class.base_rate_pct}%) + 外部视角重新估计
2. 对比你的独立估计 vs 初始估计(P≥2x=${formalized.initial_probabilities.ge_2x}%)
3. 差距 >10pp = 严重锚定
4. 检查支持性证据是否只在确认已有观点

命题摘要：
${propositionSummary}

${historyBrief}

输出：独立估计值、与初始差距、锚定判断、缺陷清单(每个含描述/方向up或down/影响pp/物质性)
`, { label: `reviewer:bias-hunter:R${round}`, phase: 'Adversary' }),
      () => agent(`
你是「${primaryTypeDim.name}」专项审查员。基于命题的不确定性类型（${uType}），从这个角度攻击。

命题摘要：
${propositionSummary}

${historyBrief}

检查要点：${primaryTypeDim.check}

输出要求：
对每个发现的缺陷（0-3个），输出：
- 缺陷描述：一句话
- 修正方向：up(乐观修正) / down(悲观修正) / neutral(方向不确定)
- 估计影响：±X pp
- 物质性判断：是否可能跨越决策边界
`, { label: `reviewer:${primaryTypeDim.key}:R${round}`, phase: 'Adversary' })
    ])
  }

  // 方向偏斜元审查 — 结构化 JSON 输出
  const directionMeta = await agent(`
你是方向偏斜元审查员。审查其他审查员的输出，不审查命题本身。

审查员输出（${mode} 模式，${reviews.filter(Boolean).length} 位）：
${reviews.filter(Boolean).map((r, i) => `--- 审查员 ${i + 1} ---\n${r}`).join('\n\n')}

决策边界：P > ${formalized.decision_function.action_up_threshold}% → ${formalized.decision_function.action_up_label}; P < ${formalized.decision_function.action_down_threshold}% → ${formalized.decision_function.action_down_label}

任务：
1. 提取所有具体修正/缺陷
2. 方向标注规则：up=乐观修正(概率应上调) / down=悲观修正(概率应下调) / neutral=方向不明确
3. 偏斜比 = max(optimistic, pessimistic) / total_corrections
4. 偏斜比 >0.8 → degradation_alert: true
5. Lakatos 判据：
   - progressive：修正产出新预测/新发现
   - degenerative：修正仅合理化原结论
   - mixed：部分进步部分退化
6. 物质性筛选：只保留 impact_pp 可能使概率跨越决策边界的缺陷

严格按 JSON schema 输出。
`, { label: `meta:direction:R${round}`, phase: 'Adversary', schema: DIRECTION_META_SCHEMA })

  // --- Phase 3: 溯源 ---
  phase('Ground')
  let groundResult = null
  if (directionMeta && directionMeta.has_material_defects) {
    const defectList = directionMeta.material_defects
      .map(d => `- [${d.id}] ${d.description} (方向:${d.direction}, 影响:${d.impact_pp}pp, 来源:${d.source_reviewer || 'unknown'})`)
      .join('\n')
    const maxSources = directionMeta.material_defects.length * 2

    groundResult = await agent(`
针对以下物质性缺陷进行一手源溯源验证。你可以使用网络搜索获取信息。

物质性缺陷清单（${directionMeta.material_defects.length} 个）：
${defectList}

命题背景：
${propositionSummary}

溯源规则：
1. 每个缺陷找 ≥2 个独立来源
2. 来源层级：L1(监管公告/SEC Filing/临床数据/论文) > L2(研报/行业数据库) > L3(媒体/自研)
3. 推理链不能引用推理链——至少一个实证锚点
4. 总工作量 ≤ ${maxSources} 个来源
5. 每完成一个缺陷立即输出结论

对每个缺陷，输出：
- 一手源证据（来源名称、层级、关键数据点）
- 交叉验证结论
- 概率修正建议（±pp，基于证据）
- 如果找不到可靠一手源，标注"溯源失败，维持原估计"
`, { label: `ground:R${round}`, phase: 'Ground' })
    log(`溯源完成：${directionMeta.material_defects.length} 个缺陷`)
  } else {
    log('Phase 3 跳过：无物质性缺陷')
  }

  // --- Phase 4: 停止判断 ---
  phase('Decide')

  const historyForDecide = history.length > 0
    ? JSON.stringify(summarizeHistory(history), null, 2)
    : '无（首轮）'

  // ontological 类型提示误差带应更宽
  const bandGuidance = uType === 'ontological'
    ? '硬约束：最小 ±8pp（本体论不确定性，不可约部分应反映在更宽的带上）'
    : uType === 'mixed'
      ? '硬约束：最小 ±6pp（混合类型，含不可约成分）'
      : '硬约束：最小 ±5pp，不得更窄。信息质量差→带应更宽'

  const decisionData = await agent(`
你是概率更新执行者。基于本轮证据更新概率估计。

命题与决策函数：
${propositionSummary}

本轮审查汇总（第 ${round} 轮）：
${JSON.stringify(directionMeta, null, 2)}

本轮溯源结果：
${groundResult || '未执行（无物质性缺陷）'}

历史概率估计：
${historyForDecide}

你的任务：
1. 基于本轮证据更新 P(≥1x), P(≥2x), P(≥3x), P(≥4x)
2. 每个概率附误差带（${bandGuidance}）
3. 判断 all_bands_in_one_zone：所有概率的 [estimate-band, estimate+band] 是否完全落在同一决策区间内
   - 决策区间：>=${formalized.decision_function.action_up_threshold}% 或 <=${formalized.decision_function.action_down_threshold}% 或 中间
   - 如果任何一个概率的误差带跨越了边界 → false
4. reasoning：简述本轮修正逻辑（1-2句话）

注意：你不判断 VERDICT。只提供概率数据。误差带反映信息质量，不是信心。
严格按 JSON schema 输出。
`, { label: `decide:R${round}`, phase: 'Decide', schema: DECIDE_SCHEMA })

  // ============================================================
  // 硬约束判断（代码级，不依赖 LLM）
  // ============================================================

  // 按不确定性类型设定最小误差带
  const effectiveMinBand = uType === 'ontological' ? 8 : uType === 'mixed' ? 6 : 5

  const minBand = Math.min(
    decisionData.probabilities.ge_1x.error_band,
    decisionData.probabilities.ge_2x.error_band,
    decisionData.probabilities.ge_3x.error_band,
    decisionData.probabilities.ge_4x.error_band
  )

  // 代码计算误差带是否扩大
  const prevProbs = history.length > 0 ? history[history.length - 1].decision.probabilities : null
  const bandWidened = errorBandWidened(decisionData.probabilities, prevProbs)
  const prevHadDefects = history.length > 0 && history[history.length - 1].meta.has_material_defects

  // 硬约束 1：第 1 轮禁止 SATURATED
  if (round === 1) {
    verdict = 'CONTINUE'
    log('硬约束：第 1 轮强制 CONTINUE')
  }
  // 硬约束 2：预算终止
  else if (round >= maxRounds) {
    verdict = 'BUDGET_STOP'
    log(`预算终止：已达 ${maxRounds} 轮上限`)
  }
  // 硬约束 3：校准锚（代码计算）
  else if (prevHadDefects && !bandWidened) {
    verdict = 'CONTINUE'
    log('校准锚触发：上轮有物质性缺陷但误差带未扩大，强制继续')
  }
  // Good VOI：误差带在决策区间内 + 带宽≥effectiveMinBand
  else if (decisionData.all_bands_in_one_zone && minBand >= effectiveMinBand) {
    verdict = 'SATURATED'
    log(`审查饱和：误差带完全在决策区间内且带宽≥${effectiveMinBand}pp`)
  }
  // 默认继续
  else {
    verdict = 'CONTINUE'
  }

  // 记录本轮
  history.push({
    round,
    mode,
    uncertainty_type: uType,
    meta: directionMeta,
    ground: groundResult,
    decision: decisionData,
    band_widened: bandWidened,
    verdict
  })

  log(`第 ${round} 轮判决：${verdict} | minBand=${minBand}pp | effectiveMin=${effectiveMinBand}pp | bandWidened=${bandWidened}`)
}

// ============================================================
// 最终报告
// ============================================================
phase('Report')

const historySummary = summarizeHistory(history)
const finalProbs = history[history.length - 1].decision.probabilities

const minBandHitCount = history.filter(h => {
  const bands = Object.values(h.decision.probabilities).map(p => p.error_band)
  return Math.min(...bands) === (uType === 'ontological' ? 8 : uType === 'mixed' ? 6 : 5)
}).length

const report = await agent(`
生成最终命题深挖报告。

## 报告结构（八章节）

### 一、命题定义与决策函数
命题：${formalized.proposition.precise_statement}
时间窗：${formalized.proposition.time_window}
问题类型：${formalized.proposition.problem_type}
决策边界：P > ${formalized.decision_function.action_up_threshold}% → ${formalized.decision_function.action_up_label}; P < ${formalized.decision_function.action_down_threshold}% → ${formalized.decision_function.action_down_label}
参照类别：${formalized.reference_class.description}（基准率 ${formalized.reference_class.base_rate_pct}%，来源：${formalized.reference_class.source}）
因子分解：${JSON.stringify(formalized.factors, null, 2)}

### 二、不确定性分类（Dual-Framework）
类型：${uType}
稳定性判断：${formalized.uncertainty.stability_assessment}
${uType === 'mixed' ? `可约部分：${formalized.uncertainty.reducible_component || '未指定'}` : ''}
跃迁信号（如果这些信号出现，需要重新评估）：
${formalized.uncertainty.regime_change_signals.map(s => `- ${s}`).join('\n')}

攻击策略：
- 通用偏差维度（5）：独立性/时间错配/循环论证/锚定/幸存者
- 类型特异性维度（${typeDims.length}）：${typeDims.map(d => d.name).join(' / ')}

### 三、对抗审查记录
审查模式：${mode}（${mode === 'FULL' ? `${5 + typeDims.length}维度` : '3对抗'}）
审查轮次：${round}

每轮数据：
${JSON.stringify(historySummary, null, 2)}

### 四、溯源与修正记录
${history.filter(h => h.ground).map(h => `[第${h.round}轮溯源]: ${h.ground}`).join('\n\n') || '无物质性缺陷需要溯源'}

### 五、条件概率树
基于因子分解构建条件概率链，验证终端节点之和≈100%。
因子数据：${JSON.stringify(formalized.factors, null, 2)}
初始概率：${JSON.stringify(formalized.initial_probabilities)}

### 六、多阈值累积概率分布
最终估计：${JSON.stringify(finalProbs, null, 2)}

### 七、修正轨迹
初始：P(≥1x)=${formalized.initial_probabilities.ge_1x}%, P(≥2x)=${formalized.initial_probabilities.ge_2x}%, P(≥3x)=${formalized.initial_probabilities.ge_3x}%, P(≥4x)=${formalized.initial_probabilities.ge_4x}%
${history.map(h => `第${h.round}轮：P(≥1x)=${h.decision.probabilities.ge_1x.estimate}%±${h.decision.probabilities.ge_1x.error_band}, P(≥2x)=${h.decision.probabilities.ge_2x.estimate}%±${h.decision.probabilities.ge_2x.error_band}, P(≥3x)=${h.decision.probabilities.ge_3x.estimate}%±${h.decision.probabilities.ge_3x.error_band}, P(≥4x)=${h.decision.probabilities.ge_4x.estimate}%±${h.decision.probabilities.ge_4x.error_band}`).join('\n')}

### 八、停止判断与方法论局限
最终判决：${verdict}（共 ${round} 轮）
${verdict === 'SATURATED' ? '✅ 审查饱和：误差带完全在决策区间内' : '⚠️ 审查未饱和：' + (round >= maxRounds ? '达到预算上限' : '误差带仍跨越决策边界')}

不确定性类型对误差带的影响：
- 最小误差带硬约束：±${uType === 'ontological' ? '8' : uType === 'mixed' ? '6' : '5'}pp（${uType === 'ontological' ? '本体论不确定性，宽带是预期而非失败' : uType === 'mixed' ? '含不可约成分' : '标准'}）
${uType === 'ontological' || uType === 'mixed' ? `- 剩余误差带中约有部分为不可约不确定性，不代表审查不充分` : ''}

误差带下限命中次数：${minBandHitCount}/${round}（命中率高暗示 agent 可能在应付硬约束而非真实估计）

方法论局限声明（必填）：
- prompt 级独立性 ≠ 认知级独立性（${mode === 'FULL' ? 5 + typeDims.length : 3} 个 reviewer 共享同一基座模型）
- 误差带由 LLM 自评，±${uType === 'ontological' ? '8' : uType === 'mixed' ? '6' : '5'}pp 下限是工程防护而非认知保证
- 误差带下限命中 ${minBandHitCount} 次——${minBandHitCount > round / 2 ? '高频命中，概率估计可能过度自信' : '正常范围'}
- 单命题评估，不替代跨标的比较决策
- 无法检测审查者与被审查者共享的系统性盲区
- 不确定性分类本身可能有误——监测 regime_change_signals

跃迁信号监测清单（以下信号出现时需重新执行本 skill）：
${formalized.uncertainty.regime_change_signals.map(s => `- ${s}`).join('\n')}

---

要求：
1. 按上述结构填充完整内容
2. 条件概率树需要合理构建（从因子出发）
3. 修正轨迹用表格展示
4. 局限声明必须诚实
5. 生成 markdown 格式报告
`, { label: 'report:final', phase: 'Report' })

return { verdict, rounds: round, mode, uncertainty_type: uType, report, history: historySummary, formalized }
