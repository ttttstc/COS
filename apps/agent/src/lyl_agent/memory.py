"""SQLite-backed structured memory and immutable decision snapshots."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterator, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

MemoryType = Literal["goal", "matter", "pattern"]
MemoryStatus = Literal["candidate", "confirmed", "stale", "rejected"]
DecisionStatus = Literal["candidate", "confirmed", "stale", "rejected"]


def utc_now() -> datetime:
    return datetime.now(UTC)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceRef(StrictModel):
    source_type: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    observed_at: datetime = Field(default_factory=utc_now)


class MemoryCreate(StrictModel):
    memory_type: MemoryType
    content: dict[str, object]
    source_refs: list[SourceRef] = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    valid_from: datetime = Field(default_factory=utc_now)
    valid_until: datetime | None = None


class MemoryUpdate(StrictModel):
    content: dict[str, object] | None = None
    source_refs: list[SourceRef] | None = Field(default=None, min_length=1)
    confidence: float | None = Field(default=None, ge=0, le=1)
    status: Literal["candidate", "stale"] | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_required_fields(cls, value: object) -> object:
        if isinstance(value, dict):
            for field in ("content", "source_refs", "confidence", "status", "valid_from"):
                if field in value and value[field] is None:
                    raise ValueError(f"{field} cannot be null")
        return value


class MemoryItem(StrictModel):
    id: str
    user_id: str
    memory_type: MemoryType
    content: dict[str, object]
    source_refs: list[SourceRef]
    confidence: float
    status: MemoryStatus
    valid_from: datetime
    valid_until: datetime | None
    last_confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContextRef(StrictModel):
    id: str
    user_id: str
    kind: Literal["goal", "matter", "decision", "pattern"]
    content: dict[str, object]
    source_refs: list[SourceRef]
    confidence: float
    status: MemoryStatus | DecisionStatus
    updated_at: datetime


class ContextSnapshot(StrictModel):
    generated_at: datetime = Field(default_factory=utc_now)
    goals: list[ContextRef] = Field(default_factory=list)
    matters: list[ContextRef] = Field(default_factory=list)
    decisions: list[ContextRef] = Field(default_factory=list)
    patterns: list[ContextRef] = Field(default_factory=list)
    constraints: list[ContextRef] = Field(default_factory=list)
    excluded_items: list[str] = Field(default_factory=list)


class DecisionRecordCreate(StrictModel):
    thread_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    context_snapshot: ContextSnapshot | None = None
    facts: list[object] = Field(default_factory=list)
    assumptions: list[object] = Field(default_factory=list)
    options: list[object] = Field(default_factory=list)
    recommendation: dict[str, object] = Field(default_factory=dict)
    confidence: int = Field(default=0, ge=0, le=100)
    reconsider_when: list[object] = Field(default_factory=list)
    user_decision: dict[str, object] = Field(default_factory=dict)
    outcome: dict[str, object] | None = None


class DecisionRecordUpdate(StrictModel):
    question: str | None = Field(default=None, min_length=1)
    facts: list[object] | None = None
    assumptions: list[object] | None = None
    options: list[object] | None = None
    recommendation: dict[str, object] | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    reconsider_when: list[object] | None = None
    user_decision: dict[str, object] | None = None
    outcome: dict[str, object] | None = None
    review_status: DecisionStatus | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_required_fields(cls, value: object) -> object:
        if isinstance(value, dict):
            for field in (
                "question",
                "facts",
                "assumptions",
                "options",
                "recommendation",
                "confidence",
                "reconsider_when",
                "user_decision",
                "review_status",
            ):
                if field in value and value[field] is None:
                    raise ValueError(f"{field} cannot be null")
        return value


class DecisionRecord(StrictModel):
    id: str
    user_id: str
    thread_id: str
    question: str
    context_snapshot: ContextSnapshot
    facts: list[object]
    assumptions: list[object]
    options: list[object]
    recommendation: dict[str, object]
    confidence: int
    reconsider_when: list[object]
    user_decision: dict[str, object]
    outcome: dict[str, object] | None
    review_status: DecisionStatus
    created_at: datetime
    updated_at: datetime


class MemoryRepository:
    """Small tenant-scoped repository; one SQLite connection per operation."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        if self.database_path != ":memory:":
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS memory_items (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL CHECK (
                        memory_type IN ('goal', 'matter', 'pattern')
                    ),
                    content TEXT NOT NULL,
                    source_refs TEXT NOT NULL,
                    confidence REAL NOT NULL CHECK (
                        confidence >= 0 AND confidence <= 1
                    ),
                    status TEXT NOT NULL CHECK (
                        status IN ('candidate', 'confirmed', 'stale', 'rejected')
                    ),
                    valid_from TEXT NOT NULL,
                    valid_until TEXT,
                    last_confirmed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS memory_items_lookup
                ON memory_items(user_id, memory_type, status, updated_at DESC);

                CREATE TABLE IF NOT EXISTS decision_records (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    thread_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    context_snapshot TEXT NOT NULL,
                    facts TEXT NOT NULL,
                    assumptions TEXT NOT NULL,
                    options TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    confidence INTEGER NOT NULL CHECK (
                        confidence >= 0 AND confidence <= 100
                    ),
                    reconsider_when TEXT NOT NULL,
                    user_decision TEXT NOT NULL,
                    outcome TEXT,
                    review_status TEXT NOT NULL CHECK (
                        review_status IN ('candidate', 'confirmed', 'stale', 'rejected')
                    ),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS decision_records_lookup
                ON decision_records(user_id, review_status, updated_at DESC);
                """
            )

    @staticmethod
    def _json(value: object) -> str:
        def default(item: object) -> object:
            if isinstance(item, BaseModel):
                return item.model_dump(mode="json")
            if isinstance(item, datetime):
                return item.isoformat()
            raise TypeError(f"{type(item).__name__} is not JSON serializable")

        return json.dumps(
            value,
            default=default,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    @staticmethod
    def _memory_from_row(row: sqlite3.Row) -> MemoryItem:
        return MemoryItem(
            id=row["id"],
            user_id=row["user_id"],
            memory_type=row["memory_type"],
            content=json.loads(row["content"]),
            source_refs=json.loads(row["source_refs"]),
            confidence=row["confidence"],
            status=row["status"],
            valid_from=row["valid_from"],
            valid_until=row["valid_until"],
            last_confirmed_at=row["last_confirmed_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _decision_from_row(row: sqlite3.Row) -> DecisionRecord:
        return DecisionRecord(
            id=row["id"],
            user_id=row["user_id"],
            thread_id=row["thread_id"],
            question=row["question"],
            context_snapshot=json.loads(row["context_snapshot"]),
            facts=json.loads(row["facts"]),
            assumptions=json.loads(row["assumptions"]),
            options=json.loads(row["options"]),
            recommendation=json.loads(row["recommendation"]),
            confidence=row["confidence"],
            reconsider_when=json.loads(row["reconsider_when"]),
            user_decision=json.loads(row["user_decision"]),
            outcome=json.loads(row["outcome"]) if row["outcome"] else None,
            review_status=row["review_status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def create_memory(self, user_id: str, item: MemoryCreate) -> MemoryItem:
        item_id = str(uuid4())
        now = utc_now().isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO memory_items (
                    id, user_id, memory_type, content, source_refs, confidence,
                    status, valid_from, valid_until, last_confirmed_at,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, NULL, ?, ?)
                """,
                (
                    item_id,
                    user_id,
                    item.memory_type,
                    self._json(item.content),
                    self._json(item.source_refs),
                    item.confidence,
                    item.valid_from.isoformat(),
                    item.valid_until.isoformat() if item.valid_until else None,
                    now,
                    now,
                ),
            )
        created = self.get_memory(user_id, item_id)
        assert created is not None
        return created

    def get_memory(self, user_id: str, item_id: str) -> MemoryItem | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM memory_items WHERE id = ? AND user_id = ?",
                (item_id, user_id),
            ).fetchone()
        return self._memory_from_row(row) if row else None

    def search_memories(
        self,
        user_id: str,
        *,
        query: str | None = None,
        memory_type: MemoryType | None = None,
        statuses: list[MemoryStatus] | None = None,
        valid_from: datetime | None = None,
        valid_until: datetime | None = None,
        limit: int = 100,
    ) -> list[MemoryItem]:
        clauses = ["user_id = ?"]
        values: list[object] = [user_id]
        if query:
            clauses.append("(LOWER(content) LIKE ? OR LOWER(source_refs) LIKE ?)")
            term = f"%{query.lower()}%"
            values.extend([term, term])
        if memory_type:
            clauses.append("memory_type = ?")
            values.append(memory_type)
        if statuses:
            placeholders = ",".join("?" for _ in statuses)
            clauses.append(f"status IN ({placeholders})")
            values.extend(statuses)
        else:
            clauses.append("status != 'rejected'")
        if valid_from:
            clauses.append("valid_from >= ?")
            values.append(valid_from.isoformat())
        if valid_until:
            clauses.append("valid_from <= ?")
            values.append(valid_until.isoformat())
        values.append(max(1, min(limit, 100)))
        sql = f"""
            SELECT * FROM memory_items
            WHERE {' AND '.join(clauses)}
            ORDER BY CASE status
                WHEN 'confirmed' THEN 0
                WHEN 'candidate' THEN 1
                WHEN 'stale' THEN 2
                ELSE 3 END,
                updated_at DESC,
                id
            LIMIT ?
        """
        with self._connect() as connection:
            rows = connection.execute(sql, values).fetchall()
        return [self._memory_from_row(row) for row in rows]

    def update_memory(
        self,
        user_id: str,
        item_id: str,
        update: MemoryUpdate,
    ) -> MemoryItem:
        existing = self.get_memory(user_id, item_id)
        if existing is None:
            raise KeyError(item_id)
        changes = update.model_dump(exclude_unset=True)
        columns: list[str] = []
        values: list[object] = []
        for field, value in changes.items():
            columns.append(f"{field} = ?")
            if field in {"content", "source_refs"}:
                value = self._json(value)
            elif isinstance(value, datetime):
                value = value.isoformat()
            values.append(value)
        if not columns:
            return existing
        columns.append("updated_at = ?")
        values.extend([utc_now().isoformat(), item_id, user_id])
        with self._connect() as connection:
            cursor = connection.execute(
                f"UPDATE memory_items SET {', '.join(columns)} "
                "WHERE id = ? AND user_id = ?",
                values,
            )
            if cursor.rowcount != 1:
                raise KeyError(item_id)
        updated = self.get_memory(user_id, item_id)
        assert updated is not None
        return updated

    def set_memory_status(
        self,
        user_id: str,
        item_id: str,
        status: MemoryStatus,
    ) -> MemoryItem:
        now = utc_now().isoformat()
        confirmed_at = now if status == "confirmed" else None
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE memory_items
                SET status = ?,
                    last_confirmed_at = COALESCE(?, last_confirmed_at),
                    updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (status, confirmed_at, now, item_id, user_id),
            )
            if cursor.rowcount != 1:
                raise KeyError(item_id)
        updated = self.get_memory(user_id, item_id)
        assert updated is not None
        return updated

    def delete_memory(self, user_id: str, item_id: str) -> None:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM memory_items WHERE id = ? AND user_id = ?",
                (item_id, user_id),
            )
            if cursor.rowcount != 1:
                raise KeyError(item_id)

    def create_decision(
        self,
        user_id: str,
        decision: DecisionRecordCreate,
    ) -> DecisionRecord:
        decision_id = str(uuid4())
        now = utc_now().isoformat()
        snapshot = decision.context_snapshot or self.build_context_snapshot(
            user_id,
            query=decision.question,
        )
        self._validate_snapshot(user_id, snapshot)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO decision_records (
                    id, user_id, thread_id, question, context_snapshot, facts,
                    assumptions, options, recommendation, confidence,
                    reconsider_when, user_decision, outcome, review_status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
                """,
                (
                    decision_id,
                    user_id,
                    decision.thread_id,
                    decision.question,
                    self._json(snapshot),
                    self._json(decision.facts),
                    self._json(decision.assumptions),
                    self._json(decision.options),
                    self._json(decision.recommendation),
                    decision.confidence,
                    self._json(decision.reconsider_when),
                    self._json(decision.user_decision),
                    self._json(decision.outcome) if decision.outcome is not None else None,
                    now,
                    now,
                ),
            )
        created = self.get_decision(user_id, decision_id)
        assert created is not None
        return created

    def get_decision(self, user_id: str, decision_id: str) -> DecisionRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM decision_records WHERE id = ? AND user_id = ?",
                (decision_id, user_id),
            ).fetchone()
        return self._decision_from_row(row) if row else None

    def search_decisions(
        self,
        user_id: str,
        *,
        query: str | None = None,
        statuses: list[DecisionStatus] | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        limit: int = 100,
    ) -> list[DecisionRecord]:
        clauses = ["user_id = ?"]
        values: list[object] = [user_id]
        if query:
            clauses.append(
                "(LOWER(question) LIKE ? OR LOWER(recommendation) LIKE ? "
                "OR LOWER(facts) LIKE ?)"
            )
            term = f"%{query.lower()}%"
            values.extend([term, term, term])
        if statuses:
            placeholders = ",".join("?" for _ in statuses)
            clauses.append(f"review_status IN ({placeholders})")
            values.extend(statuses)
        else:
            clauses.append("review_status != 'rejected'")
        if created_from:
            clauses.append("created_at >= ?")
            values.append(created_from.isoformat())
        if created_to:
            clauses.append("created_at <= ?")
            values.append(created_to.isoformat())
        values.append(max(1, min(limit, 100)))
        sql = f"""
            SELECT * FROM decision_records
            WHERE {' AND '.join(clauses)}
            ORDER BY CASE review_status
                WHEN 'confirmed' THEN 0
                WHEN 'candidate' THEN 1
                WHEN 'stale' THEN 2
                ELSE 3 END,
                updated_at DESC,
                id
            LIMIT ?
        """
        with self._connect() as connection:
            rows = connection.execute(sql, values).fetchall()
        return [self._decision_from_row(row) for row in rows]

    def update_decision(
        self,
        user_id: str,
        decision_id: str,
        update: DecisionRecordUpdate,
    ) -> DecisionRecord:
        existing = self.get_decision(user_id, decision_id)
        if existing is None:
            raise KeyError(decision_id)
        changes = update.model_dump(exclude_unset=True)
        columns: list[str] = []
        values: list[object] = []
        json_fields = {
            "facts",
            "assumptions",
            "options",
            "recommendation",
            "reconsider_when",
            "user_decision",
            "outcome",
        }
        for field, value in changes.items():
            columns.append(f"{field} = ?")
            values.append(self._json(value) if field in json_fields else value)
        if not columns:
            return existing
        columns.append("updated_at = ?")
        values.extend([utc_now().isoformat(), decision_id, user_id])
        with self._connect() as connection:
            cursor = connection.execute(
                f"UPDATE decision_records SET {', '.join(columns)} "
                "WHERE id = ? AND user_id = ?",
                values,
            )
            if cursor.rowcount != 1:
                raise KeyError(decision_id)
        updated = self.get_decision(user_id, decision_id)
        assert updated is not None
        return updated

    def delete_decision(self, user_id: str, decision_id: str) -> None:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM decision_records WHERE id = ? AND user_id = ?",
                (decision_id, user_id),
            )
            if cursor.rowcount != 1:
                raise KeyError(decision_id)

    def build_context_snapshot(
        self,
        user_id: str,
        *,
        query: str | None = None,
        selected_memory_ids: list[str] | None = None,
        limit: int = 20,
    ) -> ContextSnapshot:
        limit = max(1, min(limit, 20))
        if selected_memory_ids:
            selected = [
                item
                for item_id in selected_memory_ids
                if (item := self.get_memory(user_id, item_id)) is not None
            ]
            memories = selected
            decisions: list[DecisionRecord] = []
            relevant_ids = set(selected_memory_ids)
        else:
            matched_memories = self.search_memories(user_id, query=query, limit=100)
            matched_decisions = self.search_decisions(user_id, query=query, limit=100)
            relevant_ids = {
                item.id for item in [*matched_memories, *matched_decisions]
            }
            memories = [
                *matched_memories,
                *(
                    item
                    for item in self.search_memories(user_id, limit=100)
                    if item.id not in relevant_ids
                ),
            ]
            decisions = [
                *matched_decisions,
                *(
                    item
                    for item in self.search_decisions(user_id, limit=100)
                    if item.id not in relevant_ids
                ),
            ]

        refs = [self._memory_ref(item) for item in memories]
        refs.extend(self._decision_ref(item) for item in decisions)
        status_rank = {"confirmed": 0, "candidate": 1, "stale": 2, "rejected": 3}
        refs.sort(
            key=lambda ref: (
                status_rank[ref.status],
                0 if ref.id in relevant_ids else 1,
                -ref.updated_at.timestamp(),
                ref.id,
            )
        )
        selected_refs = refs[:limit]
        excluded = [ref.id for ref in refs[limit:]]
        return ContextSnapshot(
            goals=[ref for ref in selected_refs if ref.kind == "goal"],
            matters=[ref for ref in selected_refs if ref.kind == "matter"],
            decisions=[ref for ref in selected_refs if ref.kind == "decision"],
            patterns=[ref for ref in selected_refs if ref.kind == "pattern"],
            excluded_items=excluded,
        )

    def _validate_snapshot(
        self,
        user_id: str,
        snapshot: ContextSnapshot,
    ) -> None:
        refs = [
            *snapshot.goals,
            *snapshot.matters,
            *snapshot.decisions,
            *snapshot.patterns,
            *snapshot.constraints,
        ]
        for ref in refs:
            if ref.user_id != user_id:
                raise ValueError("Context Snapshot contains another user's data.")
            if ref.kind == "decision":
                if self.get_decision(user_id, ref.id) is None:
                    raise ValueError("Context Snapshot contains an unknown decision.")
                continue
            memory = self.get_memory(user_id, ref.id)
            if memory is None or memory.memory_type != ref.kind:
                raise ValueError("Context Snapshot contains an unknown memory.")

    @staticmethod
    def _memory_ref(item: MemoryItem) -> ContextRef:
        return ContextRef(
            id=item.id,
            user_id=item.user_id,
            kind=item.memory_type,
            content=item.content,
            source_refs=item.source_refs,
            confidence=item.confidence,
            status=item.status,
            updated_at=item.updated_at,
        )

    @staticmethod
    def _decision_ref(item: DecisionRecord) -> ContextRef:
        return ContextRef(
            id=item.id,
            user_id=item.user_id,
            kind="decision",
            content={
                "question": item.question,
                "recommendation": item.recommendation,
                "outcome": item.outcome,
            },
            source_refs=[
                SourceRef(
                    source_type="thread",
                    source_id=item.thread_id,
                    observed_at=item.created_at,
                )
            ],
            confidence=item.confidence / 100,
            status=item.review_status,
            updated_at=item.updated_at,
        )
