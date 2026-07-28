# 第五部分：记忆与检索

## 20. 数据库模型

## 20.1 `users`

```sql
id uuid primary key
display_name text
timezone text
created_at timestamptz
updated_at timestamptz
```

## 20.2 `counsel_threads`

```sql
id uuid primary key
user_id uuid references users(id)
langgraph_thread_id text unique
title text
mode text
status text
summary text
created_at timestamptz
updated_at timestamptz
archived_at timestamptz null
```

## 20.3 `memory_items`

```sql
id uuid primary key
user_id uuid references users(id)
memory_type text -- goal, matter, pattern, doctrine, constraint
content jsonb
source_refs jsonb
confidence numeric
status text -- candidate, confirmed, stale, rejected, deleted
valid_from timestamptz
valid_until timestamptz null
last_confirmed_at timestamptz null
created_at timestamptz
updated_at timestamptz
```

## 20.4 `decision_records`

```sql
id uuid primary key
user_id uuid references users(id)
thread_id uuid references counsel_threads(id)
question text
context_snapshot jsonb
facts jsonb
assumptions jsonb
options jsonb
recommendation jsonb
confidence integer
reconsider_when jsonb
user_decision jsonb
outcome jsonb null
review_status text
created_at timestamptz
updated_at timestamptz
```

## 20.5 `evidence_items`

```sql
id uuid primary key
thread_id uuid references counsel_threads(id)
source_type text
source_uri text
title text
published_at timestamptz null
retrieved_at timestamptz
summary text
claim text
relation text -- support, oppose, limit, context
authority_score integer
relevance_score integer
freshness_score integer
verified boolean
metadata jsonb
```

## 20.6 `counsel_feedback`

```sql
id uuid primary key
user_id uuid references users(id)
thread_id uuid references counsel_threads(id)
decision_record_id uuid null
feedback_type text
rating integer null
comment text null
created_at timestamptz
```

---

## 21. Context Snapshot

每次正式建议都冻结一份 Context Snapshot，防止后续记忆变化导致无法复盘。

```python
class ContextSnapshot(BaseModel):
    generated_at: datetime
    goals: list[MemoryRef]
    matters: list[MemoryRef]
    decisions: list[DecisionRef]
    patterns: list[MemoryRef]
    constraints: list[MemoryRef]
    excluded_items: list[str]
```

Artifact 的“历史依据”展示该 Snapshot。

---

## 22. 检索策略

第一版采用混合检索：

1. 类型过滤；
2. 时间与状态过滤；
3. 关键词/BM25；
4. 可选向量相似度；
5. LLM 相关性重排；
6. 主 Agent 最终筛选。

检索规则：

- confirmed > candidate；
- 当前目标 > 旧目标；
- 有结果的决策 > 仅讨论记录；
- 近 90 天优先，但长期底线和原则不衰减；
- 冲突记忆必须一起返回；
- 每次最多向主 Agent 注入 20 条结构化记忆；
- 原始聊天按需拉取，不整体塞入上下文。

---

## 23. 记忆写入流程

主 Agent 不直接写入 confirmed memory。

流程：

```text
Agent 生成 Memory Proposal
        ↓
规则判断风险和重复
        ↓
普通事项：写入 candidate
重要目标/原则/模式：请求用户确认
        ↓
确认后写入 confirmed
```

诊断模式发现的思维模式必须用户确认。

---

# 第六部分：输出 Schema

## 24. NextActionCard

```python
class NextActionCard(BaseModel):
    scope: Literal["local", "global"]
    current_stage: str
    main_contradiction: str
    action_title: str
    action_description: str
    completion_criteria: list[str]
    why_now: str
    pause_or_stop: list[str]
    assumptions: list[str]
    confidence: int = Field(ge=0, le=100)
    need_research: bool
    reconsider_when: list[str]
```

## 25. DecisionCard

```python
class DecisionOption(BaseModel):
    id: str
    title: str
    summary: str
    benefits: list[str]
    costs: list[str]
    risks: list[str]

class DecisionCard(BaseModel):
    decision_question: str
    objectives: list[str]
    constraints: list[str]
    main_contradiction: str
    facts: list[str]
    assumptions: list[str]
    unknowns: list[str]
    options: list[DecisionOption]
    recommended_option_id: str
    recommendation_reason: str
    opposition_view: list[str]
    confidence: int = Field(ge=0, le=100)
    reconsider_when: list[str]
```

## 26. DiagnosisCard

```python
class PatternEvidence(BaseModel):
    source_id: str
    date: datetime
    excerpt_summary: str
    relevance: str

class DiagnosisPattern(BaseModel):
    id: str
    title: str
    description: str
    category: Literal["strength", "risk", "watch"]
    evidence: list[PatternEvidence]
    counter_evidence: list[PatternEvidence]
    confidence: int

class DiagnosisCard(BaseModel):
    strengths: list[DiagnosisPattern]
    risk_patterns: list[DiagnosisPattern]
    priority_improvement_id: str
    suggested_rule: str
    next_practice: str
    limitations: list[str]
    confidence: int
```

---
