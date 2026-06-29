export const meta = {
  name: 'bayes-v4',
  description: '深度引擎 v4.0 — 预测→测量→惊讶循环（最小切面验证）',
  phases: [
    { title: 'Formalize', detail: 'Phase 1: 命题形式化 + 多维度预测提取' },
    { title: 'HardVerify', detail: 'B1: 硬验证（API 数据 + 代码确定性验证）' },
    { title: 'SoftVerify', detail: 'B2: 双读对抗软验证（Claude vs Qwen）' },
    { title: 'Surprise', detail: '惊讶汇总 + 覆盖率分层报告' },
    { title: 'Report', detail: '最终报告' },
  ],
}

// ============================================================
// Schemas
// ============================================================

const FORMALIZE_SCHEMA = {
  type: 'object',
  properties: {
    proposition: {
      type: 'object',
      properties: {
        precise_statement: { type: 'string' },
        time_window: { type: 'string' },
        problem_type: { type: 'string', enum: ['has_reference_class', 'weak_reference_class', 'no_reference_class'] },
      },
      required: ['precise_statement', 'time_window', 'problem_type'],
    },
    reference_class: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        base_rate_pct: { type: 'number' },
        source: { type: 'string' },
      },
      required: ['description', 'base_rate_pct', 'source'],
    },
    uncertainty_type: { type: 'string', enum: ['deterministic', 'epistemic', 'ontological', 'mixed'] },
    factors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['hard_core', 'protective_belt'] },
        },
        required: ['name', 'type'],
      },
    },
  },
  required: ['proposition', 'reference_class', 'uncertainty_type', 'factors'],
}

const PREDICTION_SCHEMA = {
  type: 'object',
  properties: {
    predictions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string' },
          dimension: { type: 'string', enum: ['macro', 'company', 'market', 'structure', 'behavior', 'intent'] },
          if_thesis_correct: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              direction: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
              threshold: { type: 'string' },
            },
            required: ['description', 'direction'],
          },
          if_thesis_wrong: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              direction: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
              threshold: { type: 'string' },
            },
            required: ['description', 'direction'],
          },
          hypothesis_direction: { type: 'string', enum: ['falsification', 'null_hypothesis'] },
          data_source: { type: 'string' },
          verifiable_by: { type: 'string' },
          verification_type: { type: 'string', enum: ['hard_api', 'soft_search', 'human_confirm', 'hard_code', 'soft_read'] },
        },
        required: ['factor', 'dimension', 'if_thesis_correct', 'if_thesis_wrong', 'data_source', 'verification_type', 'hypothesis_direction'],
      },
    },
    premise_audits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          premise: { type: 'string' },
          evidence_required: { type: 'string' },
          verified_by: { type: 'string' },
          status: { type: 'string', enum: ['unverified', 'confirmed', 'refuted'] },
        },
        required: ['premise', 'evidence_required', 'status'],
      },
    },
  },
  required: ['predictions', 'premise_audits'],
}

const DIRECTION_SCHEMA = {
  type: 'object',
  properties: {
    direction: { type: 'string', enum: ['positive', 'negative', 'neutral', 'ambiguous'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    key_evidence: { type: 'string' },
    source_quality: {
      type: 'object',
      properties: {
        entity_anchored: { type: 'boolean' },
        action_verb: { type: 'boolean' },
        authoritative_source: { type: 'boolean' },
      },
      required: ['entity_anchored', 'action_verb', 'authoritative_source'],
    },
  },
  required: ['direction', 'confidence', 'key_evidence', 'source_quality'],
}

const HARD_VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string' },
          dimension: { type: 'string' },
          predicted_direction: { type: 'string' },
          actual_value: { type: 'string' },
          actual_direction: { type: 'string', enum: ['positive', 'negative', 'neutral', 'unavailable'] },
          surprise: { type: 'boolean' },
          source: { type: 'string' },
          as_of: { type: 'string' },
        },
        required: ['factor', 'predicted_direction', 'actual_direction', 'surprise', 'source'],
      },
    },
  },
  required: ['results'],
}

// ============================================================
// Constants
// ============================================================

const SOURCE_MAX_CHARS = 3000

// ============================================================
// Helpers
// ============================================================

function checkDistinguishability(predictions) {
  const valid = []
  const rejected = []
  for (const p of predictions) {
    if (p.if_thesis_correct.direction === p.if_thesis_wrong.direction) {
      rejected.push({ factor: p.factor, reason: 'D2 区分力不足：正反方向相同' })
    } else {
      valid.push(p)
    }
  }
  return { valid, rejected }
}

function sourceQualityPass(sq) {
  if (!sq) return false
  const checks = [sq.entity_anchored, sq.action_verb, sq.authoritative_source]
  return checks.filter(Boolean).length >= 2
}

// W1+W7 fix: canonical surprise judgment — code-level, used by both B1 and B2
function judgeSurprise(predicted, actual) {
  if (actual === 'unavailable' || actual === 'neutral' || actual === 'ambiguous') return false
  return predicted !== actual
}

// W3 fix: truncate source text to equal length for both agents
function truncateSource(text) {
  if (!text || text.length <= SOURCE_MAX_CHARS) return text
  return text.slice(0, SOURCE_MAX_CHARS) + '\n[...截断至 ' + SOURCE_MAX_CHARS + ' 字符]'
}

// Shared agreement logic for B2 dual-read (reused by soft_search and soft_read)
function computeSoftAgreement(agentA, agentB, pred) {
  if (!agentA || !agentB) return null
  const aDir = agentA.direction
  const bDir = agentB.direction
  let agreement, surprise

  if (aDir === 'ambiguous' && bDir === 'ambiguous') {
    agreement = 'insufficient_evidence'
    surprise = false
  } else if (aDir === 'ambiguous' || bDir === 'ambiguous') {
    const clearDir = aDir !== 'ambiguous' ? aDir : bDir
    surprise = judgeSurprise(pred.if_thesis_correct.direction, clearDir)
    agreement = surprise ? 'single_agent_opposing' : 'single_agent_supporting'
  } else if (aDir === bDir) {
    surprise = judgeSurprise(pred.if_thesis_correct.direction, aDir)
    agreement = surprise ? 'consistent_opposing' : 'consistent_supporting'
  } else {
    agreement = 'divergent'
    surprise = false
  }

  const aSQ = sourceQualityPass(agentA.source_quality)
  const bSQ = sourceQualityPass(agentB.source_quality)

  return {
    factor: pred.factor,
    dimension: pred.dimension,
    predicted_direction: pred.if_thesis_correct.direction,
    agent_a: { direction: aDir, evidence: agentA.key_evidence, source_quality_pass: aSQ },
    agent_b: { direction: bDir, evidence: agentB.key_evidence, source_quality_pass: bSQ },
    agreement,
    surprise,
    low_signal: !aSQ && !bSQ,
    confidence: 'soft',
  }
}

// ============================================================
// Phase 1: 命题形式化 + 预测提取
// ============================================================
phase('Formalize')

const thesisPath = args.thesis_path || ''
const claim = args.claim || ''

const formalized = await agent(`
你是命题形式化执行者。

用户命题：${claim}
Thesis 文件路径（如有）：${thesisPath}

任务：
1. 将命题转化为精确可验证形式（主体 + 时间窗 + 阈值）
2. 找到参照类别和基准率
3. 判定不确定性类型（deterministic / epistemic / ontological / mixed）
4. 分解为 3-8 个子因子，标注硬核/保护带

如果提供了 thesis 路径，先完整阅读 thesis.md，利用其中的 falsification_conditions 和 monitoring_signals。

拒绝模糊命题（"前景如何"），只接受可量化命题。
如果 problem_type = no_reference_class，在 precise_statement 中说明。
`, { label: 'formalize', phase: 'Formalize', schema: FORMALIZE_SCHEMA })

if (formalized.proposition.problem_type === 'no_reference_class') {
  log('终止：无参照类别，本方法不适用')
  return { verdict: 'NOT_APPLICABLE', formalized }
}

log(`命题：${formalized.proposition.precise_statement}`)
log(`不确定性：${formalized.uncertainty_type} | 因子数：${formalized.factors.length}`)

// 预测提取
const predictions = await agent(`
你是预测提取器。从命题和因子中提取三维度方向性预测。

命题：${formalized.proposition.precise_statement}
时间窗：${formalized.proposition.time_window}
不确定性类型：${formalized.uncertainty_type}
因子：${JSON.stringify(formalized.factors)}
${thesisPath ? `Thesis 路径：${thesisPath}（请完整阅读，特别是 falsification_conditions 和 monitoring_signals）` : ''}

要求：
1. 每个预测必须归入维度之一：
   - 金融场景：macro（宏观/政策/行业）、company（公司财务/运营/管线）、market（价格/资金/波动率）
   - 代码场景：structure（文件/函数/模块结构事实）、behavior（运行时行为/测试/调用链）、intent（设计意图/变更原因/文档声明）
   - 根据命题内容自动选择适用的维度集
2. 每个预测必须有正反两面（if_thesis_correct vs if_thesis_wrong），方向必须不同（D2 区分力）
3. verification_type 标注：
   - hard_api：可通过 API 获取数值数据验证（股价、财务指标、宏观数据）
   - hard_code：可通过 shell 命令确定性验证（grep、wc -l、git diff --stat、test execution）
   - soft_search：需要搜索非结构化信息源验证（公告、研报、新闻）
   - soft_read：需要双模型独立解读代码/文档语义验证
   - human_confirm：不可自动验证，需人类确认
4. 附带 3-5 个「不验自明」的前提审计（premise_audit），标注 status=unverified
5. threshold 字段说明什么值算"击穿"预测

**零假设预测要求（关键）**：
6. 每个核心断言（硬核因子）必须同时拆出两个方向的预测：
   - **证伪预测**（hypothesis_direction: "falsification"）：如果结论有问题，我们应该看到什么证据？（例如：「如果 Nightly Review 偏自由格式，我们应该看到 X/Y/Z 缺失」）
   - **零假设预测**（hypothesis_direction: "null_hypothesis"）：如果结论大体正确，我们应该看到什么证据？（例如：「如果 Nightly Review 已有结构化框架，我们应该在代码中看到 X/Y/Z」）
7. 零假设预测与证伪预测数量大致相当（比例 40%-60%）

总预测数量 6-12 个，覆盖三个维度，且包含证伪和零假设两个方向。
`, { label: 'predict-extract', phase: 'Formalize', schema: PREDICTION_SCHEMA })

// D2 区分力代码校验
const { valid: validPredictions, rejected } = checkDistinguishability(predictions.predictions)
if (rejected.length > 0) {
  log(`D2 校验：${rejected.length} 个预测因区分力不足被拒绝`)
  rejected.forEach(r => log(`  ❌ ${r.factor}: ${r.reason}`))
}

// 零假设覆盖率检查
const falsificationCount = validPredictions.filter(p => p.hypothesis_direction === 'falsification').length
const nullHypothesisCount = validPredictions.filter(p => p.hypothesis_direction === 'null_hypothesis').length
const totalWithDirection = falsificationCount + nullHypothesisCount

if (totalWithDirection > 0 && nullHypothesisCount === 0) {
  log(`⚠️ 零假设覆盖率 = 0%：所有预测都是证伪方向，可能过度聚焦于「找问题」而忽视「确认合理」`)
} else if (totalWithDirection > 0) {
  const nullRatio = nullHypothesisCount / totalWithDirection
  if (nullRatio < 0.4) {
    log(`⚠️ 零假设覆盖率 = ${(nullRatio * 100).toFixed(0)}%（< 40%）：零假设预测不足，验证可能偏向证伪`)
  }
}

log(`有效预测：${validPredictions.length} 个（证伪 ${falsificationCount} / 零假设 ${nullHypothesisCount}）| 前提审计：${predictions.premise_audits.length} 个`)

// 分类
const hardPredictions = validPredictions.filter(p => p.verification_type === 'hard_api')
const hardCodePredictions = validPredictions.filter(p => p.verification_type === 'hard_code')
const softPredictions = validPredictions.filter(p => p.verification_type === 'soft_search')
const softReadPredictions = validPredictions.filter(p => p.verification_type === 'soft_read')
const humanPredictions = validPredictions.filter(p => p.verification_type === 'human_confirm')

log(`分类：硬验证 ${hardPredictions.length} | 代码硬验证 ${hardCodePredictions.length} | 软验证 ${softPredictions.length} | 代码软验证 ${softReadPredictions.length} | 人类确认 ${humanPredictions.length}`)

// ============================================================
// B1: 硬验证（API 数据）
// ============================================================
phase('HardVerify')

let b1Results = { results: [] }
if (hardPredictions.length > 0) {
  const hardList = hardPredictions.map(p =>
    `- [${p.dimension}] ${p.factor}: 预测方向=${p.if_thesis_correct.direction}, 数据源=${p.data_source}${p.if_thesis_correct.threshold ? `, 阈值=${p.if_thesis_correct.threshold}` : ''}`
  ).join('\n')

  b1Results = await agent(`
你是硬验证执行者。通过 API 和数据查询验证预测方向。

命题：${formalized.proposition.precise_statement}
待验证预测（${hardPredictions.length} 个）：
${hardList}

工作目录：当前项目根目录

可用数据工具（通过 Bash 调用）：
1. 股价/K线：python -c "from scripts.shared.opend_price_provider import fetch_prices; print(fetch_prices(['9926.HK']))"
2. FRED 宏观指标：python -c "from src.antifragile.agent.api_clients.macro_client import MacroClient; ..."
3. 其他行情：python -c "import yfinance as yf; print(yf.Ticker('9926.HK').info)"

对每个预测：
1. 调用合适的 API 获取实际数据
2. 判定实际方向（positive/negative/neutral/unavailable）
3. 与预测方向比较，判定是否惊讶（surprise）：预测方向与实测方向相反=true；实测为neutral/unavailable=false
4. 如果 API 不可用或数据缺失，标记 actual_direction=unavailable, surprise=false

按 JSON schema 返回所有结果。
`, { label: 'b1:hard-verify', phase: 'HardVerify', schema: HARD_VERIFY_SCHEMA })

  // W7 fix: code-level surprise override — don't trust LLM's surprise judgment
  for (const r of b1Results.results) {
    r.surprise = judgeSurprise(r.predicted_direction, r.actual_direction)
  }

  const hardSurprises = b1Results.results.filter(r => r.surprise)
  log(`B1 硬验证完成：${b1Results.results.length} 个 | 惊讶 ${hardSurprises.length} 个`)
} else {
  log('B1 跳过：无 hard_api 类型预测')
}

// B1c: 代码硬验证（shell 命令）
let b1cResults = { results: [] }
if (hardCodePredictions.length > 0) {
  const codeList = hardCodePredictions.map(p =>
    `- [${p.dimension}] ${p.factor}: 预测方向=${p.if_thesis_correct.direction}, 验证手段=${p.data_source}${p.if_thesis_correct.threshold ? `, 阈值=${p.if_thesis_correct.threshold}` : ''}`
  ).join('\n')

  b1cResults = await agent(`
你是代码硬验证执行者。通过 shell 命令和代码分析验证预测方向。

命题：${formalized.proposition.precise_statement}
待验证预测（${hardCodePredictions.length} 个）：
${codeList}

可用验证手段（通过 Bash 调用）：
1. 文件/结构统计：wc -l, find, ls, tree
2. 代码搜索：grep -rn, ripgrep (rg)
3. Git 历史：git log, git blame, git diff --stat
4. 测试执行：npm test, python -m pytest, go test 等
5. 依赖分析：grep import/require, 调用链追溯

对每个预测：
1. 执行合适的 shell 命令获取实际数据
2. 判定实际方向（positive/negative/neutral/unavailable）
3. 与预测方向比较，判定是否惊讶：预测方向与实测方向相反=true；实测为neutral/unavailable=false
4. 如果命令执行失败或无结果，标记 actual_direction=unavailable, surprise=false

按 JSON schema 返回所有结果。
`, { label: 'b1c:code-verify', phase: 'HardVerify', schema: HARD_VERIFY_SCHEMA })

  for (const r of b1cResults.results) {
    r.surprise = judgeSurprise(r.predicted_direction, r.actual_direction)
  }

  const codeSurprises = b1cResults.results.filter(r => r.surprise)
  log(`B1c 代码硬验证完成：${b1cResults.results.length} 个 | 惊讶 ${codeSurprises.length} 个`)
} else {
  log('B1c 跳过：无 hard_code 类型预测')
}

// ============================================================
// B2: 软验证（双读对抗）
// ============================================================
phase('SoftVerify')

const b2Results = []
if (softPredictions.length > 0) {
  const softResults = await pipeline(
    softPredictions,

    // Stage 1: 源获取
    (pred) => agent(`
你是源获取执行者。为以下因子搜索相关信息源。

因子：${pred.factor}
维度：${pred.dimension}
数据源提示：${pred.data_source}
命题背景：${formalized.proposition.precise_statement}

搜索策略（按优先级）：
1. 已知权威源 URL 时，优先用 mcp__firecrawl__firecrawl_scrape 获取全文（返回清洁 Markdown，抗 JS 渲染）
2. firecrawl_scrape 不可用或返回空时，fallback 到 WebFetch
3. 使用 Research Gateway 搜索：PYTHONPATH=src python -m antifragile.research.gateway "查询" --context news
   ⚠️ 若 Gateway 输出 Notes 包含 `websearch_needed: <query>`，**必须立即**调用 Claude 内置 WebSearch 工具搜索该 query（这是所有网络源失败后的最终兜底，不可跳过）
4. Gateway 无结果时直接调用 WebSearch 工具搜索关键词
5. 如上述不可用，通过 Bash 用 curl 搜索

提取与该因子方向判断相关的关键信息（≤${SOURCE_MAX_CHARS}字符）。
包含具体数据点、日期、来源机构名称。
`, { label: `fetch:${pred.factor.slice(0, 30)}`, phase: 'SoftVerify' }),

    // Stage 2: 双读对抗
    (sourceText, pred, idx) => {
      if (!sourceText) return null

      // W3 fix: 对称截断，两个 agent 获取相同信息
      const truncated = truncateSource(sourceText)
      const tmpFile = `/tmp/bayes_b2_${idx}_prompt.txt`

      return parallel([
        // Agent A: Claude 解读
        () => agent(`
你是 Agent A（方向解读者）。从源文档中提取 ${pred.factor} 的方向性信号。

因子：${pred.factor}
预测的正面条件：${pred.if_thesis_correct.description}
预测的反面条件：${pred.if_thesis_wrong.description}

源文档：
${truncated}

任务：
1. 判断源文档信息对该因子的方向：positive / negative / neutral / ambiguous
2. 评估源质量（三选二通过）：
   - entity_anchored: 含具体公司名/股票代码/人名
   - action_verb: 含决策动词（终止/批准/辞任/收购/发行/暂停/获批/延期）
   - authoritative_source: 来自官方披露渠道
3. 提供关键证据摘要

独立判断，不要预设结论。
`, { label: `agentA:${pred.factor.slice(0, 20)}`, phase: 'SoftVerify', schema: DIRECTION_SCHEMA }),

        // Agent B: Qwen 解读（通过 idealab_client.py + 文件传递）
        // W2 fix: 使用临时文件传递源文档，避免 shell 注入
        () => agent(`
你的任务是调用 Qwen 模型对源文档做独立方向解读。

步骤：
1. 先将以下 user prompt 内容写入临时文件 ${tmpFile}：

因子：${pred.factor}
正面条件：${pred.if_thesis_correct.description}
反面条件：${pred.if_thesis_wrong.description}
源文档：
${truncated}

2. 然后通过 Bash 执行（在当前项目根目录下）：
python scripts/shared/idealab_client.py --system "你是投资方向判断助手。只输出JSON，格式：{direction: positive/negative/neutral/ambiguous, confidence: high/medium/low, key_evidence: 一句话摘要, source_quality: {entity_anchored: true/false, action_verb: true/false, authoritative_source: true/false}}" --user-file ${tmpFile} --json

3. 解析 Qwen 返回的 JSON，填入 schema 返回。

如果调用失败，返回 direction=ambiguous 并在 key_evidence 说明错误。
`, { label: `agentB:${pred.factor.slice(0, 20)}`, phase: 'SoftVerify', schema: DIRECTION_SCHEMA }),
      ]).then(([agentA, agentB]) => computeSoftAgreement(agentA, agentB, pred))
    }
  )

  softResults.filter(Boolean).forEach(r => b2Results.push(r))
  const softSurprises = b2Results.filter(r => r.surprise)
  const divergences = b2Results.filter(r => r.agreement === 'divergent')
  log(`B2 软验证完成：${b2Results.length} 个 | 软惊讶 ${softSurprises.length} | 解读分歧 ${divergences.length}`)
} else {
  log('B2 跳过：无 soft_search 类型预测')
}

// B2c: 代码软验证（双模型代码语义解读）
const b2cResults = []
if (softReadPredictions.length > 0) {
  const codeReadResults = await pipeline(
    softReadPredictions,

    // Stage 1: 代码源获取
    (pred) => agent(`
你是代码源获取执行者。为以下因子获取相关代码文件内容。

因子：${pred.factor}
维度：${pred.dimension}
数据源提示：${pred.data_source}
命题背景：${formalized.proposition.precise_statement}

获取策略：
1. 使用 Read 工具读取指定文件
2. 使用 Grep 搜索相关代码片段（函数定义、调用处、配置项）
3. 使用 git blame/log 查看关键行的变更历史

提取与该因子方向判断相关的关键代码片段和上下文（≤${SOURCE_MAX_CHARS}字符）。
包含文件路径、行号、函数签名等定位信息。
`, { label: `code-fetch:${pred.factor.slice(0, 30)}`, phase: 'SoftVerify' }),

    // Stage 2: 双模型代码解读对抗
    (sourceCode, pred, idx) => {
      if (!sourceCode) return null
      const truncated = truncateSource(sourceCode)
      const tmpFile = `/tmp/bayes_b2c_${idx}_prompt.txt`

      return parallel([
        // Agent A: Claude 代码解读
        () => agent(`
你是 Agent A（代码语义解读者）。从代码片段中提取 ${pred.factor} 的方向性信号。

因子：${pred.factor}
正面条件（命题成立时）：${pred.if_thesis_correct.description}
反面条件（命题不成立时）：${pred.if_thesis_wrong.description}

代码片段：
${truncated}

任务：
1. 判断代码对该因子的方向：positive / negative / neutral / ambiguous
2. 评估证据质量（三选二通过）：
   - entity_anchored: 含具体函数名/类名/变量名/文件路径
   - action_verb: 含确定性操作（调用/赋值/返回/抛出/断言）
   - authoritative_source: 来自被测代码本身（非注释/文档/推测）
3. 提供关键证据摘要（引用具体代码行）

独立判断，不要预设结论。
`, { label: `codeA:${pred.factor.slice(0, 20)}`, phase: 'SoftVerify', schema: DIRECTION_SCHEMA }),

        // Agent B: Qwen 代码解读
        () => agent(`
你的任务是调用 Qwen 模型对代码片段做独立语义解读。

步骤：
1. 先将以下 user prompt 内容写入临时文件 ${tmpFile}：

因子：${pred.factor}
正面条件：${pred.if_thesis_correct.description}
反面条件：${pred.if_thesis_wrong.description}
代码片段：
${truncated}

2. 然后通过 Bash 执行：
python scripts/shared/idealab_client.py --system "你是代码语义分析助手。分析代码片段，判断其对给定因子的方向性。只输出JSON，格式：{direction: positive/negative/neutral/ambiguous, confidence: high/medium/low, key_evidence: 一句话摘要（引用具体代码）, source_quality: {entity_anchored: true/false, action_verb: true/false, authoritative_source: true/false}}" --user-file ${tmpFile} --json

3. 解析 Qwen 返回的 JSON，填入 schema 返回。

如果调用失败，返回 direction=ambiguous 并在 key_evidence 说明错误。
`, { label: `codeB:${pred.factor.slice(0, 20)}`, phase: 'SoftVerify', schema: DIRECTION_SCHEMA }),
      ]).then(([agentA, agentB]) => computeSoftAgreement(agentA, agentB, pred))
    }
  )

  codeReadResults.filter(Boolean).forEach(r => b2cResults.push(r))
  const codeReadSurprises = b2cResults.filter(r => r.surprise)
  const codeReadDivergences = b2cResults.filter(r => r.agreement === 'divergent')
  log(`B2c 代码软验证完成：${b2cResults.length} 个 | 惊讶 ${codeReadSurprises.length} | 解读分歧 ${codeReadDivergences.length}`)
} else {
  log('B2c 跳过：无 soft_read 类型预测')
}

// ============================================================
// 惊讶汇总 + 覆盖率
// ============================================================
phase('Surprise')

const hardSurprises = b1Results.results.filter(r => r.surprise)
const codeSurprises = b1cResults.results.filter(r => r.surprise)
const softSurprises = b2Results.filter(r => r.surprise)
const codeReadSurprises = b2cResults.filter(r => r.surprise)
const divergences = b2Results.filter(r => r.agreement === 'divergent')
const codeReadDivergences = b2cResults.filter(r => r.agreement === 'divergent')
const lowSignalDivergences = [...divergences, ...codeReadDivergences].filter(r => r.low_signal)

const totalPredictions = validPredictions.length
const hardCovered = b1Results.results.filter(r => r.actual_direction !== 'unavailable').length
const codeCovered = b1cResults.results.filter(r => r.actual_direction !== 'unavailable').length
const softCovered = b2Results.filter(r => r.agreement !== 'insufficient_evidence').length
const codeReadCovered = b2cResults.filter(r => r.agreement !== 'insufficient_evidence').length
const uncovered = humanPredictions.length
  + b1Results.results.filter(r => r.actual_direction === 'unavailable').length
  + b1cResults.results.filter(r => r.actual_direction === 'unavailable').length

// W6: assert mutual exclusivity
const coverageSum = hardCovered + codeCovered + softCovered + codeReadCovered + uncovered
if (coverageSum > totalPredictions) {
  log(`⚠️ 覆盖率校验：${coverageSum} > ${totalPredictions}，分类可能重叠`)
}

const hardCoverageRate = totalPredictions > 0 ? (hardCovered / totalPredictions * 100).toFixed(1) : '0'
const codeCoverageRate = totalPredictions > 0 ? (codeCovered / totalPredictions * 100).toFixed(1) : '0'
const softCoverageRate = totalPredictions > 0 ? (softCovered / totalPredictions * 100).toFixed(1) : '0'
const codeReadCoverageRate = totalPredictions > 0 ? (codeReadCovered / totalPredictions * 100).toFixed(1) : '0'
const uncoveredRate = totalPredictions > 0 ? (uncovered / totalPredictions * 100).toFixed(1) : '0'

// D7 覆盖率警告（总覆盖率）
const d7Warning = totalPredictions > 0 && (uncovered / totalPredictions) > 0.5

// D7 方向覆盖率（证伪 vs 零假设）
const falsificationPredictions = validPredictions.filter(p => p.hypothesis_direction === 'falsification')
const nullHypothesisPredictions = validPredictions.filter(p => p.hypothesis_direction === 'null_hypothesis')
const falsificationTotal = falsificationPredictions.length
const nullHypothesisTotal = nullHypothesisPredictions.length

// 构建验证结果索引（避免 O(n²)）
const verifiedFactors = new Set()
for (const r of b1Results.results) {
  if (r.actual_direction !== 'unavailable') verifiedFactors.add(r.factor)
}
for (const r of b1cResults.results) {
  if (r.actual_direction !== 'unavailable') verifiedFactors.add(r.factor)
}
for (const r of b2Results) {
  if (r.agreement !== 'insufficient_evidence') verifiedFactors.add(r.factor)
}
for (const r of b2cResults) {
  if (r.agreement !== 'insufficient_evidence') verifiedFactors.add(r.factor)
}

const falsificationCovered = falsificationPredictions.filter(p => verifiedFactors.has(p.factor)).length
const nullHypothesisCovered = nullHypothesisPredictions.filter(p => verifiedFactors.has(p.factor)).length

const falsificationCoverageRate = falsificationTotal > 0 ? (falsificationCovered / falsificationTotal * 100).toFixed(1) : 'N/A'
const nullHypothesisCoverageRate = nullHypothesisTotal > 0 ? (nullHypothesisCovered / nullHypothesisTotal * 100).toFixed(1) : 'N/A'

// D7 方向覆盖率警告
const d7DirectionWarning = falsificationTotal > 0 && nullHypothesisTotal === 0
const d7DirectionLowWarning = falsificationTotal > 0 && nullHypothesisTotal > 0 && (nullHypothesisTotal / (falsificationTotal + nullHypothesisTotal)) < 0.4

log(`\n=== 惊讶汇总 ===`)
log(`硬惊讶：${hardSurprises.length} 个`)
if (codeSurprises.length > 0) log(`代码硬惊讶：${codeSurprises.length} 个`)
log(`软惊讶：${softSurprises.length} 个`)
if (codeReadSurprises.length > 0) log(`代码软惊讶：${codeReadSurprises.length} 个`)
log(`解读分歧：${divergences.length + codeReadDivergences.length} 个（低信号 ${lowSignalDivergences.length} 个）`)
log(`\n=== 覆盖率（分层，禁止聚合）===`)
log(`硬覆盖：${hardCoverageRate}%（${hardCovered}/${totalPredictions}）— 置信度高`)
if (codeCovered > 0) log(`代码硬覆盖：${codeCoverageRate}%（${codeCovered}/${totalPredictions}）— 置信度高`)
log(`软覆盖：${softCoverageRate}%（${softCovered}/${totalPredictions}）— 置信度中（有效折扣~60%）`)
if (codeReadCovered > 0) log(`代码软覆盖：${codeReadCoverageRate}%（${codeReadCovered}/${totalPredictions}）— 置信度中`)
log(`未覆盖：${uncoveredRate}%（${uncovered}/${totalPredictions}）— 纯人类判断区`)
if (d7Warning) {
  log(`⚠️ D7 警告：未覆盖率 ${uncoveredRate}% > 50%，无惊讶 ≠ 安全`)
}
log(`\n=== 方向覆盖率（D7 双向检查）===`)
log(`证伪方向：${falsificationCovered}/${falsificationTotal} 覆盖（${falsificationCoverageRate}%）`)
log(`零假设方向：${nullHypothesisCovered}/${nullHypothesisTotal} 覆盖（${nullHypothesisCoverageRate}%）`)
if (d7DirectionWarning) {
  log(`⚠️ D7 方向警告：零假设预测数量 = 0，可能过度聚焦于「找问题」而忽视「确认合理」`)
}
if (d7DirectionLowWarning) {
  log(`⚠️ D7 方向警告：零假设占比 < 40%，验证可能偏向证伪`)
}

// ============================================================
// 最终报告
// ============================================================
phase('Report')

const surpriseSummary = {
  hard: hardSurprises.map(r => ({ factor: r.factor, predicted: r.predicted_direction, actual: r.actual_direction, value: r.actual_value })),
  hard_code: codeSurprises.map(r => ({ factor: r.factor, predicted: r.predicted_direction, actual: r.actual_direction, value: r.actual_value })),
  soft: softSurprises.map(r => ({ factor: r.factor, predicted: r.predicted_direction, agentA: r.agent_a.direction, agentB: r.agent_b.direction })),
  soft_read: codeReadSurprises.map(r => ({ factor: r.factor, predicted: r.predicted_direction, agentA: r.agent_a.direction, agentB: r.agent_b.direction })),
  divergences: [...divergences, ...codeReadDivergences].map(r => ({ factor: r.factor, agentA: r.agent_a.direction, agentB: r.agent_b.direction, low_signal: r.low_signal })),
}

const report = await agent(`
生成 Bayes v4.0 深度引擎报告。

## 报告结构

### 一、命题定义
${formalized.proposition.precise_statement}
时间窗：${formalized.proposition.time_window}
参照类别：${formalized.reference_class.description}（基准率 ${formalized.reference_class.base_rate_pct}%）
不确定性类型：${formalized.uncertainty_type}

### 二、预测清单
有效预测 ${validPredictions.length} 个（被拒 ${rejected.length} 个因 D2 区分力不足）
${JSON.stringify(validPredictions.map(p => ({ factor: p.factor, dim: p.dimension, type: p.verification_type, correct_dir: p.if_thesis_correct.direction, wrong_dir: p.if_thesis_wrong.direction })), null, 2)}

前提审计 ${predictions.premise_audits.length} 个：
${JSON.stringify(predictions.premise_audits, null, 2)}

### 三、硬验证结果（B1）
${JSON.stringify(b1Results.results, null, 2)}
${b1cResults.results.length > 0 ? `\n### 三b、代码硬验证结果（B1c）\n${JSON.stringify(b1cResults.results, null, 2)}` : ''}

### 四、软验证结果（B2 双读对抗）
${JSON.stringify(b2Results, null, 2)}
${b2cResults.length > 0 ? `\n### 四b、代码软验证结果（B2c 双模型代码解读）\n${JSON.stringify(b2cResults, null, 2)}` : ''}

### 五、惊讶汇总
${JSON.stringify(surpriseSummary, null, 2)}

### 六、覆盖率分层报告
| 层 | 覆盖率 | 数量 | 置信度 |
|----|--------|------|--------|
| 硬覆盖（API） | ${hardCoverageRate}% | ${hardCovered}/${totalPredictions} | 高 |
${codeCovered > 0 ? `| 硬覆盖（代码） | ${codeCoverageRate}% | ${codeCovered}/${totalPredictions} | 高 |\n` : ''}| 软覆盖（搜索） | ${softCoverageRate}% | ${softCovered}/${totalPredictions} | 中（折扣~60%） |
${codeReadCovered > 0 ? `| 软覆盖（代码解读） | ${codeReadCoverageRate}% | ${codeReadCovered}/${totalPredictions} | 中 |\n` : ''}| 未覆盖 | ${uncoveredRate}% | ${uncovered}/${totalPredictions} | 无 |
${d7Warning ? '\n⚠️ D7 覆盖率警告：未覆盖率 > 50%，"无惊讶"不等于"安全"' : ''}

### 七、边界诚实声明
必须包含：
- 本系统是 alpha 探测器 + 纠偏器，不是 alpha 发生器
- 软证据：双 LLM 一致 ≠ 事实为真
- 硬证据：往往是零 alpha 区域（市场效率对已量化信息定价更快）
- 解读分歧的投资价值：市场未定价 = 潜在 alpha 区域
- 前提审计中 status=unverified 的前提仍需人类验证
- 本次为最小切面验证（v4.0-alpha），未实现解释层和决策层

要求：
1. 按上述结构填充完整内容
2. 用表格展示验证结果
3. 分层报告覆盖率，禁止聚合为单一数字
4. 生成 markdown 格式
`, { label: 'report:final', phase: 'Report' })

return {
  verdict: hardSurprises.length + codeSurprises.length + softSurprises.length + codeReadSurprises.length > 0 ? 'SURPRISES_FOUND' : 'NO_SURPRISE',
  formalized,
  predictions: { valid: validPredictions, rejected, premise_audits: predictions.premise_audits },
  b1: b1Results,
  b1c: b1cResults,
  b2: b2Results,
  b2c: b2cResults,
  surprise_summary: surpriseSummary,
  coverage: {
    hard: hardCoverageRate,
    hard_code: codeCoverageRate,
    soft: softCoverageRate,
    soft_read: codeReadCoverageRate,
    uncovered: uncoveredRate,
    d7_warning: d7Warning,
    direction: {
      falsification: { total: falsificationTotal, covered: falsificationCovered, rate: falsificationCoverageRate },
      null_hypothesis: { total: nullHypothesisTotal, covered: nullHypothesisCovered, rate: nullHypothesisCoverageRate },
      d7_direction_warning: d7DirectionWarning || d7DirectionLowWarning
    }
  },
  report,
}
