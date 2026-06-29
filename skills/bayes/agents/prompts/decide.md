# Phase 4: 概率更新 Prompt

> 输出强制为 JSON schema。VERDICT 由代码硬逻辑判断，本 agent 只提供数据。
> schema: DECIDE_SCHEMA

---

你是概率更新执行者。基于本轮审查结果更新概率估计。

Phase 1 命题与决策函数：
{formalized}

Phase 2 审查汇总（第 {round} 轮）：
{direction_meta_json}

Phase 3 溯源结果：
{ground_result}

历史概率估计：
{history_probs}

你的任务（严格执行）：
1. 基于本轮证据更新 P(≥1x), P(≥2x), P(≥3x), P(≥4x)
2. 每个概率附误差带（硬约束：误差带最小 ±5pp，不得更窄）
3. 判断：所有误差带是否完全落在同一个决策区间内
4. 判断：相比上一轮，误差带是否扩大了（首轮填 false）

注意：
- 误差带反映信息质量，不是主观信心
- 不确定性高 → 带宽；溯源证据与原估计矛盾 → 带应扩大
- 你不需要判断 VERDICT，只需诚实提供数据

## 停止判断硬约束（由代码执行，供你参考）

- round == 1 → 强制 CONTINUE（不可能 SATURATED）
- 误差带 < ±5pp → 无效（代码会强制拒绝 SATURATED）
- 上轮有物质性缺陷但带未扩大 → 强制 CONTINUE
- 所有带完全在一个区间内 + 最小带宽 ≥5pp → SATURATED
