---
name: taixu-pipeline
description: "太虚五转连招：osborn→hegel→bayes→feynman→debono 自动串联编排器。触发词: 一键五转, 跑五转, taixu-pipeline."
kind: composed
metadata:
  visibility: public
  risk: medium
  capabilities: [filesystem-read, filesystem-write, llm-call]
composition:
  final_output: debono
  steps:
    - id: osborn
      kind: skill
      skill: osborn
      args:
        topic: "{{ input.topic }}"
      checkpoint: true

    - id: hegel
      kind: skill
      skill: hegel
      depends_on: [osborn]
      args:
        standalone: true
        lens: ideation
        target: "{{ steps.osborn.output.idea_pool_path }}"
        target_type: idea_pool
      checkpoint: true

    - id: bayes
      kind: skill
      skill: bayes
      depends_on: [hegel]
      args:
        input: "{{ steps.hegel.output.report_path }}"
      checkpoint: true

    - id: feynman
      kind: skill
      skill: feynman
      depends_on: [bayes]
      args:
        input: "{{ steps.bayes.output.report_path }}"
      checkpoint: true

    - id: debono
      kind: skill
      skill: debono
      depends_on: [feynman]
      soft_depends_on: [feynman]
      args:
        input: "{{ steps.feynman.output.report_path }}"
      on_failure: skip
      checkpoint: true
  time_baselines:
    # 初始估计值（基于 standalone 模式），使用 ≥10 次后用实际中位数替换
    osborn: 8min
    hegel: 8min    # standalone 模式（跳过 S3/S4/S5）
    bayes: 10min
    feynman: 10min
    debono: 8min
  checkpoint_signals:
    hegel: [terminal_status, system_type]
    feynman: [veto_count]
---

# 太虚五转自动串联编排器

一键串联 osborn→hegel→bayes→feynman→debono，保证完整五转流程不被嵌套降级污染。

## 使用方式

触发词：`太虚五转`、`一键五转`、`taixu-pipeline`

需要提供 `input.topic`（分析主题，如"太虚五转自动串联 + 防 Hegel 嵌套降级"）。

可选参数：
- `--steps osborn,hegel,bayes` — 仅执行指定步骤子集
- 每个步骤后设 CHECKPOINT，用户可选择继续、跳过或终止

## 组合概览

1. **osborn** (skill: osborn) — 发散阶段，产出 idea-pool.md
2. **hegel** (skill: hegel --standalone) — 收敛阶段，⚠️ 硬编码传入 --standalone 跳过内嵌验证
3. **bayes** (skill: bayes) — 验证阶段，使用独立 lens 完整能力
4. **feynman** (skill: feynman) — 审查阶段，使用独立 lens 完整能力
5. **debono** (skill: debono) — 归真阶段，on_failure: skip（可选）。debono 完成后**自动触发五转综合总结**（V2.2 强制），写入 `docs/reports/{topic-slug}-taixu-summary-{date}.md`

## 防嵌套机制

- hegel step 的 `args.standalone: true` 在 composition block 中硬编码，配置级强制
- hegel SKILL.md §6.1/§7.1/§8.1 检测到 --standalone 时跳过 bayes/feynman 内嵌调用
- 独立调用 `/hegel` 时不带此参数，行为完全不变（向后兼容）

## CHECKPOINT 协议

每个 step 完成后暂停，向用户展示：

```
📊 Step: {step_id} | ⏱ {elapsed}min (typical: {baseline}min)
🔴 Signals: {signal_key}={signal_value} ...
⚠️ 偏离 typical >2x        ← 仅当 elapsed / typical > 2 时显示
   产出物: {report_path}
   下一步: {next_step_id}
   选项: 继续 / 跳过 / 终止 / 重跑
```

### 时间追踪

每个 step 开始前和结束后各执行一次 `date '+%s'` 记录 epoch 时间戳，差值转换为分钟。⚠️ 时间追踪依赖 shell 环境可用；若 LLM 遗漏 `date` 执行，追踪静默失败（无报错，缺数据）。

```bash
step_start=$(date '+%s')
# ... 执行 step ...
step_end=$(date '+%s')
elapsed_min=$(( (step_end - step_start) / 60 ))
```

typical 基准值见 frontmatter `time_baselines`。初始值为估计值（基于 standalone 模式），使用 ≥10 次后用实际中位数替换。

### 信号展示

从 step 产出物（report 文件）的 YAML frontmatter 中提取 `signals` 字段，按 `checkpoint_signals` 配置过滤后展示。

高亮规则：
- hegel `terminal_status` 值 ≠ "converged" → 🔴 高亮
- hegel `system_type` 与 osborn `problem_type` 不一致 → 🔴 高亮
- feynman `veto_count` 值 ≥ 1 → 🔴 高亮

### problem_type 一致性检查

hegel step 完成后，比较 hegel report 中的 `signals.system_type` 与 osborn 产出物中的 `problem_type`。不一致时在 checkpoint 附加警告行。若 osborn 产出物无 `problem_type` 字段，跳过比较（不报错）。

用户回复后继续执行。若用户选择跳过，后续 depends_on 该步骤的 step 自动跳过（soft_depends_on 除外）。

## --steps 子集执行

支持 `--steps hegel,bayes` 语法：
- 仅执行指定步骤及其依赖
- 未指定步骤的产出物需已存在（从上次运行恢复）
- 若依赖缺失且无法恢复，报错并提示补全

## 注意

- 所有原子 skill 仍可独立使用，本 composed skill 是可选上层编排
- debono 为 soft_depends_on + on_failure: skip，即使 feynman 失败也不阻断管线
- debono 完成后自动触发五转综合总结（debono V2.2 内置），生成 `docs/reports/{topic}-taixu-summary-{date}.md`，包含全程叙事、关键转折、核心洞察、元认知收获。此为强制步骤，不可跳过
- 全程产出物写入 `docs/hegel-reports/` 或 `docs/osborn-pools/`，综合总结写入 `docs/reports/`，按日期命名
- pipeline 全部 step 完成后（或用户终止后），将各 step 的执行时间汇总追加到 debono 综合总结末尾，格式：

  ```markdown
  ## 时间日志
  | Step | 耗时 | Typical | 偏离 |
  |------|------|---------|------|
  | osborn | 8min | 8min | 1.0x |
  | hegel | 12min | 8min | 1.5x |
  | bayes | 10min | 10min | 1.0x |
  | feynman | 15min | 10min | 1.5x |
  | debono | 6min | 8min | 0.75x |
  ```

  时间日志用于 retro 分析和 typical 值校准（≥10 次后用实际中位数替换初始估计值）
