# 第七部分：接口与事件

## 27. LangGraph Run Context

前端提交：

```json
{
  "messages": [],
  "context": {
    "mode": "ask",
    "scope": "global",
    "selected_memory_ids": [],
    "file_ids": []
  }
}
```

## 28. 业务 API

### 28.1 记忆

```http
GET    /api/memories
POST   /api/memories
PATCH  /api/memories/{id}
DELETE /api/memories/{id}
POST   /api/memories/{id}/confirm
POST   /api/memories/{id}/reject
```

### 28.2 决策

```http
GET  /api/decisions
GET  /api/decisions/{id}
POST /api/decisions/{id}/feedback
POST /api/decisions/{id}/outcome
POST /api/decisions/{id}/review
```

### 28.3 Artifact

```http
GET /api/threads/{threadId}/artifact
GET /api/threads/{threadId}/artifact/versions
```

### 28.4 文件

第一版可复用现有上传逻辑，服务端保存：

- File ID；
- MIME；
- 大小；
- Hash；
- 提取文本；
- 用户 ID；
- Thread ID。

---

## 29. UI Event

推荐统一事件：

```typescript
type CounselEvent =
  | { type: "stage.started"; stage: CounselStage }
  | { type: "stage.completed"; stage: CounselStage }
  | { type: "evidence.added"; evidence: EvidenceItem }
  | { type: "artifact.updated"; artifact: CounselArtifact }
  | { type: "memory.proposed"; proposal: MemoryProposal }
  | { type: "decision.created"; decisionId: string };
```

使用 LangGraph state stream 或 UI state 承载，不另造 WebSocket 协议。

---

# 第八部分：调研与工具

## 30. 工具清单

MVP：

- Web Search；
- Web Page Fetch；
- GitHub Repository Read；
- Uploaded File Search；
- Calculator；
- Current Date/Time；
- Memory Search；
- Decision History Search。

可选：

- 邮件和日历读取；
- 不在 MVP 范围，不实现写操作。

---

## 31. 工具权限

权限分级：

### Read-only

默认允许：

- 搜索；
- 读取用户授权的文件；
- 读取结构化记忆；
- 读取决策历史。

### Write-internal

允许：

- 保存 Thread；
- 保存 Artifact；
- 创建 candidate memory；
- 保存 decision record；
- 保存用户反馈。

### External write

MVP 禁止：

- 发送邮件；
- 创建日历；
- 修改文件；
- 操作代码仓；
- 对外发布；
- 支付或下单。

---

## 32. 证据评级

每条 Evidence 计算：

```text
Evidence Score =
  0.40 × Authority
+ 0.30 × Relevance
+ 0.20 × Freshness
+ 0.10 × Verifiability
```

0–5 分制。

展示等级：

- 4.0–5.0：强证据；
- 3.0–3.9：中等证据；
- 2.0–2.9：弱证据；
- <2.0：仅作线索，不进入关键结论。

评分不能代替人工/模型判断，必须保存评分原因。

---

# 第九部分：Prompt 架构

## 33. System Prompt 分层

不使用一个超长 Prompt 包含全部逻辑。

### 33.1 Core Identity

- 长期参谋；
- 用户最终拍板；
- 不迎合；
- 不越权；
- 事实与价值分离；
- 结论明确；
- 不展示私有思维链。

### 33.2 User Context

动态注入 Context Snapshot。

### 33.3 Mode Skill

按 `mode` 加载对应 Skill。

### 33.4 Tool Policy

- 何时搜索；
- 何时停止；
- 来源要求；
- 高风险边界。

### 33.5 Output Contract

使用 Pydantic/JSON Schema 约束正式卡片。

---

## 34. 核心行为规则

1. 先判断用户真正需要决定或推进什么；
2. 不将用户提供的手段自动视为目标；
3. 能自行调查的事实不反问用户；
4. 低风险可逆问题优先快速行动；
5. 正式建议必须给出首选；
6. 必须说明代价和暂停事项；
7. 证据不足时明确未知；
8. 重要建议必须有改判条件；
9. 记忆冲突时不得暗自选择；
10. 不引用不存在的历史；
11. 不将一次性情绪写成稳定人格；
12. 用户反驳后重新判断，而不是机械坚持。

---

# 第十部分：安全、隐私与边界

## 35. 隐私

- 数据按用户隔离；
- LangGraph Thread 必须绑定 user_id；
- 文件与 Artifact 使用私有对象存储；
- 日志不得记录完整敏感 Prompt、密钥和文件正文；
- 支持删除 Thread、文件和记忆；
- 诊断前明确数据范围；
- 导出和删除属于后续 P1，但数据表需预留。

## 36. Prompt Injection

外部网页和文件属于不可信输入：

- 内容不得覆盖 System Prompt；
- 工具返回只作为证据；
- 文件中的“指令”默认视为文本；
- 来源引用必须与具体 claim 绑定；
- 写入记忆前清理恶意指令；
- 不允许网页内容触发外部写操作。

## 37. 高风险问题

医疗、法律、投资、人身安全：

- 标记风险领域；
- 搜索当前权威信息；
- 不提供确定性保证；
- 建议咨询专业人士；
- 不保存高度敏感信息为长期模式；
- 紧急安全问题优先给出本地求助渠道。

---

# 第十一部分：可观测性

## 38. Trace

每次 Run 记录：

- mode；
- 使用的 memory IDs；
- 工具调用；
- 研究分支；
- Interrupt 次数；
- Artifact version；
- Token/成本；
- 延迟；
- 错误；
- 用户反馈。

不记录私有思维链。

## 39. 关键日志

```text
run.started
context.retrieved
interrupt.requested
research.started
research.completed
artifact.finalized
memory.proposed
feedback.received
run.failed
```

---
