export const meta = {
  name: 'bayes-v4-spike',
  description: 'Spike：验证 v4.0 三条基础设施通路',
  phases: [
    { title: 'Bash-Python', detail: 'subagent 通过 Bash 调用 Python 脚本' },
    { title: 'Idealab', detail: 'subagent 通过 Bash 调用 idealab_client.py' },
    { title: 'WebSearch', detail: 'subagent 使用 web search 获取源文档' },
  ],
}

const SPIKE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    result: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['success', 'result'],
}

// ============================================================
// 通路 1：subagent Bash → Python
// ============================================================
phase('Bash-Python')
const bashPython = await agent(`
你的任务是验证能否通过 Bash 调用 Python 脚本。

执行以下命令：
python -c "from scripts.shared.opend_price_provider import is_opend_available; print('opend_available:', is_opend_available())"

工作目录是当前项目根目录

报告执行结果。如果成功返回 success=true 和输出内容；如果失败返回 success=false 和错误信息。
`, { label: 'spike:bash-python', phase: 'Bash-Python', schema: SPIKE_SCHEMA })

log(`通路1 Bash→Python: ${bashPython.success ? '✅' : '❌'} ${bashPython.result}`)

// ============================================================
// 通路 2：subagent Bash → idealab_client.py → Qwen
// ============================================================
phase('Idealab')
const idealab = await agent(`
你的任务是验证能否通过 Bash 调用 idealab_client.py 获取 Qwen 的回答。

执行以下命令（在当前项目根目录下）：
python scripts/shared/idealab_client.py --system "你是方向判断助手，只输出JSON" --user "康方生物(9926.HK)的HARMONi-6三期临床OS数据对公司估值的影响方向是什么？回答格式：{direction: positive/negative, reason: 一句话}" --json

报告执行结果。如果成功返回 success=true 和 Qwen 的回答内容；如果失败返回 success=false 和错误信息。
`, { label: 'spike:idealab', phase: 'Idealab', schema: SPIKE_SCHEMA })

log(`通路2 Idealab/Qwen: ${idealab.success ? '✅' : '❌'} ${idealab.result}`)

// ============================================================
// 通路 3：subagent web search
// ============================================================
phase('WebSearch')
const webSearch = await agent(`
你的任务是验证能否使用 web search 工具获取投资相关信息。

搜索："康方生物 HARMONi-6 ASCO 2026"

要求：
1. 使用可用的搜索工具（WebSearch 或 mcp__fetch__fetch）搜索上述关键词
2. 从搜索结果中提取 1-2 条关键信息
3. 返回 success=true + 搜索到的关键信息摘要

如果没有搜索工具可用或搜索失败，返回 success=false + 错误说明。
`, { label: 'spike:websearch', phase: 'WebSearch', schema: SPIKE_SCHEMA })

log(`通路3 WebSearch: ${webSearch.success ? '✅' : '❌'} ${webSearch.result}`)

// ============================================================
// 汇总
// ============================================================
const allPass = [bashPython, idealab, webSearch].every(r => r && r.success)
log(`\n=== Spike 结果 ===`)
log(`通路1 Bash→Python: ${bashPython?.success ? 'PASS' : 'FAIL'}`)
log(`通路2 Idealab/Qwen: ${idealab?.success ? 'PASS' : 'FAIL'}`)
log(`通路3 WebSearch: ${webSearch?.success ? 'PASS' : 'FAIL'}`)
log(`总结: ${allPass ? '✅ 全部通过，可进入正式实现' : '❌ 有通路不通，需调整计划'}`)

return {
  all_pass: allPass,
  bash_python: bashPython,
  idealab: idealab,
  web_search: webSearch,
}
