# 统一会商状态与 Handoff 契约

> Issue #34 的第一阶段契约。本文只锁定跨 Skill 的数据边界，不代表完整
> Counsel Session Controller 已经完成。

## 核心模式

用户可感知的核心模式固定为：

```text
next_action | deep_research | thinking_coach | historical_reflection
```

`discuss` 保留为普通自由讨论表面；历史 Thread 中的 `ask / decide / research /
diagnose / discuss` 继续可读，由适配层映射到上述模式。`decide` 是共享决策推理
能力，不再新增为一级核心模式。

## CounselSession

一个 Thread 只能有一个顶层 `CounselSession`。Skill 子状态不得重复覆盖议题目标、
当前模式、Context Snapshot、用户裁决、正式 Artifact 和恢复点。

```yaml
counsel_session:
  issue_id: string
  subject: string
  user_intent: string
  desired_outcome: string
  active_mode: next_action | deep_research | thinking_coach | historical_reflection | discuss
  previous_modes: list
  current_stage: string
  status: active | awaiting_user | researching | ready | completed | paused | superseded
  context_snapshot_id: string | null
  active_artifact_id: string | null
  active_decision_record_id: string | null
  facts: list[object]
  assumptions: list[object]
  unknowns: list[object]
  user_commitments: list[object]
  pending_interrupt: object | null
  handoff_reason: string | null
  review_trigger: object | null
```

后端校验模型：`apps/agent/src/lyl_agent/contracts.py` 的 `CounselSession`；前端
解析模型：`apps/web/src/lib/counsel-contract.ts` 的 `CounselSession`。

## HandoffContract

跨 Skill 转接必须传递结构化上下文，不得通过拼接完整消息历史代替：

```yaml
handoff:
  from_mode: surface_mode
  to_mode: surface_mode
  reason: string
  user_goal: string
  preserved_context: object
  unresolved_question: string | null
  expected_output: string
  estimated_depth: quick | standard | deep
  needs_user_confirmation: boolean
  return_to: string | null
```

重大调研、历史分析或不可逆决策必须设置 `needs_user_confirmation: true`，并说明
预期产物与额外成本。每个 Handoff 只能执行一次；`return_to` 用于研究完成后回到
原议题，不得新建无关 Thread。

## Artifact 版本关系

正式 Artifact 必须保存 `source_skill`、`source_version`、`supersedes` 和
`superseded_by`。版本关系使用稳定引用 `<artifact_type>:v<version>`，旧 Artifact
只标记为 `superseded`，不得覆盖原始事实、用户裁决或 Context Snapshot。

`next_action` 的 `decision_snapshot` 还必须保存 `superseded_decisions`，用于连续
询问时区分继续、完成和改判。

## 写入责任

| 数据 | 唯一写入责任 |
| --- | --- |
| 顶层模式与会商状态 | Session Controller（当前阶段由适配层初始化） |
| Skill 事实、假设、未知 | 当前 Skill 的结构化 normalizer |
| Artifact 版本与 lineage | Artifact finalize |
| 用户裁决与 Interrupt | Interrupt resume handler |
| 行动结果与反馈 | 后续 #13 闭环能力 |

本阶段不实现完整路由、六类 Handoff 执行或新的 Skill；这些将在各核心能力状态
稳定后接入。
