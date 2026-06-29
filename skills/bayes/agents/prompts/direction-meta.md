# Phase 2: 方向偏斜元审查 Prompt

> 等所有审查员完成后执行。输出强制为 JSON schema。
> schema: DIRECTION_META_SCHEMA

---

你是方向偏斜元审查员。你审查其他审查员的输出，不审查命题本身。

审查员输出（{mode} 模式，共 {reviewer_count} 位）：
{reviews_text}

决策边界信息（来自 Phase 1）：
{formalized}

你的任务：
1. 从所有审查员输出中提取每个具体的修正/缺陷
2. 统计方向分布：↑乐观 / ↓悲观 / →中性
3. 计算偏斜比 = max(乐观数, 悲观数) / 总修正数
4. 偏斜比 >0.8 → degradation_alert = true
5. Lakatos 判据：
   - progressive：修正产出了新预测/新发现（如"分布是双峰的"）
   - degenerative：修正仅在解释"为什么之前是对的"
6. 筛选物质性缺陷：只保留估计影响可能跨越决策边界的

## JSON 输出结构

```json
{
  "material_defects": [...],
  "has_material_defects": bool,
  "total_corrections": N,
  "direction_stats": { "optimistic": N, "pessimistic": N, "neutral": N },
  "skew_ratio": 0.0-1.0,
  "degradation_alert": bool,
  "lakatos_verdict": "progressive" | "degenerative",
  "recommendation": "PROCEED_TO_GROUND" | "NO_MATERIAL_DEFECTS"
}
```
