# 第三部分：主 Agent 设计

## 12. 单主 Agent 原则

MVP 只有一个对用户负责的主 Agent。

不创建常驻：

- 情报参谋；
- 红队参谋；
- 方案参谋；
- 验收参谋。

复杂调研时允许内部并行研究分支，但它们不是独立产品角色，也不直接向用户发言。

所有最终信息由主 Agent：

- 去重；
- 解决冲突；
- 判断证据；
- 形成建议；
- 统一汇报。

---

## 13. Graph 状态

```python
class CounselState(TypedDict, total=False):
    # LangGraph required
    messages: Annotated[list[BaseMessage], add_messages]

    # Session
    user_id: str
    thread_id: str
    mode: Literal["ask", "decide", "research", "diagnose", "discuss"]
    scope: Literal["local", "global"] | None

    # Problem
    raw_request: str
    normalized_question: str
    objectives: list[str]
    constraints: list[str]
    value_tradeoffs: list[str]

    # Context
    selected_memory_ids: list[str]
    context_snapshot: dict
    current_stage: str | None
    historical_patterns: list[dict]

    # Research
    need_research: bool
    research_plan: dict | None
    evidence: list[dict]
    unresolved_unknowns: list[str]

    # Reasoning outputs
    main_contradiction: str | None
    options: list[dict]
    opposition_view: list[str]
    recommendation: dict | None
    confidence: int | None
    reconsider_when: list[str]

    # UI
    stages: list[dict]
    ui: list[dict]
    artifact: dict | None

    # Persistence
    memory_proposals: list[dict]
    decision_record_id: str | None
    feedback: dict | None
```

---

## 14. Graph 节点

MVP 节点：

```text
START
  ↓
intake
  ↓
mode_router
  ↓
retrieve_context
  ↓
context_relevance_check
  ↓
problem_reframe
  ↓
needs_user_input? ── yes → interrupt → resume
  ↓ no
needs_research?
  ├─ no  → counsel_reasoning
  └─ yes → research_scope
             ↓
           optional research approval interrupt
             ↓
           research_execute
             ↓
           evidence_review
             ↓
           counsel_reasoning
  ↓
red_team_if_needed
  ↓
synthesize_counsel
  ↓
render_artifact
  ↓
propose_memory_update
  ↓
END
```

### 14.1 避免过重的规则

- `ask` 默认不进入研究；
- `decide` 仅在关键事实缺失时研究；
- `research` 才默认执行研究流程；
- `diagnose` 使用历史检索，不默认联网；
- Red Team 只用于重大、不可逆或用户明确要求的决策；
- 低风险可逆问题可从 `problem_reframe` 直接进入 `synthesize_counsel`。

---

# 第四部分：Skill 规格

## 15. Skill 定义

Skill 是主 Agent 使用的结构化行为协议，包括：

- 适用条件；
- 必要输入；
- 方法约束；
- 输出 Schema；
- 失败与降级策略。

Skill 不负责：

- 长期身份；
- Thread 生命周期；
- 用户关系；
- 记忆持久化；
- 最终统一汇报。

---

## 16. `ask-lyl` Skill

### 输入

```python
class AskLYLInput(BaseModel):
    request: str
    scope: Literal["local", "global"]
    context_snapshot: ContextSnapshot
```

### 处理协议

1. 确认判断范围；
2. 恢复相关目标、事项、决定和模式；
3. 判断当前阶段；
4. 识别“不知道下一步”的原因；
5. 找出主要矛盾；
6. 生成候选行动；
7. 选择唯一主行动；
8. 定义完成标准；
9. 指出暂停事项；
10. 输出置信度和改判条件。

### 候选行动评分

不实现复杂机器学习排序，使用可解释启发式：

```text
Action Score =
  0.30 × 对主要矛盾的影响
+ 0.25 × 降低关键不确定性的能力
+ 0.20 × 对长期目标的贡献
+ 0.10 × 可执行性
+ 0.10 × 可逆性
- 0.05 × 机会成本
```

每项 0–5 分。评分只用于内部比较，最终输出必须由主 Agent复核。

### 输出

使用 `NextActionCard` Schema。

---

## 17. `decide-lyl` Skill

### 输入

```python
class DecideLYLInput(BaseModel):
    question: str
    options_from_user: list[str] = []
    context_snapshot: ContextSnapshot
```

### 处理协议

1. 将用户提出的手段还原为目标；
2. 明确目标、约束、偏好和底线；
3. 识别主要矛盾；
4. 区分事实、假设和未知；
5. 只保留 2–4 个现实方案；
6. 分析机会成本和二阶效应；
7. 对主方案进行反方审查；
8. 给出明确推荐；
9. 定义改判条件。

### 输出

使用 `DecisionCard` Schema。

---

## 18. `research-lyl` Skill

### 处理协议

1. 研究必须绑定一个决策问题；
2. 先快速摸底，再规划；
3. 研究方向相互独立、避免重复；
4. 默认最多 5 个研究角度；
5. 优先第一方和权威来源；
6. 每条关键证据记录来源和日期；
7. 证据必须明确支持、反对或限制哪个判断；
8. 达到停止条件后结束；
9. 输出对原判断的变化，而不只输出报告。

### 停止条件

满足任一条件即可停止：

- 已获得足够证据区分主要方案；
- 新来源连续不再改变判断；
- 达到预设来源或时间预算；
- 关键事实无法获得，但已明确限制；
- 最小试验比继续调研更有价值。

---

## 19. `diagnose-lyl` Skill

### 输入

```python
class DiagnoseLYLInput(BaseModel):
    date_from: date | None
    date_to: date | None
    topic: str | None
    sources: list[Literal["chat", "memory", "decision"]]
```

### 处理协议

1. 只使用用户确认的数据范围；
2. 检索重复主题和行为轨迹；
3. 区分稳定模式、阶段状态和偶发事件；
4. 每个模式至少需要 2 条不同时间证据，除非明确标记“待观察”；
5. 同时寻找反例；
6. 诊断优势与风险；
7. 只提出一个优先改进项；
8. 由用户确认后才写入长期模式记忆。

---
