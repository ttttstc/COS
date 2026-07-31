from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from lyl_agent.memory import (
    DecisionRecordCreate,
    DecisionRecordUpdate,
    MemoryCreate,
    MemoryRepository,
    MemoryUpdate,
    SourceRef,
)


def source(source_id: str = "message-1") -> SourceRef:
    return SourceRef(
        source_type="chat",
        source_id=source_id,
        observed_at=datetime.now(UTC),
    )


@pytest.fixture
def repository(tmp_path: object) -> MemoryRepository:
    return MemoryRepository(tmp_path / "memory.sqlite3")  # type: ignore[operator]


@pytest.mark.parametrize("memory_type", ["goal", "matter", "pattern"])
def test_memory_lifecycle(
    repository: MemoryRepository,
    memory_type: str,
) -> None:
    created = repository.create_memory(
        "user-a",
        MemoryCreate(
            memory_type=memory_type,
            content={"summary": f"{memory_type} content"},
            source_refs=[source()],
            confidence=0.8,
        ),
    )

    assert created.status == "candidate"
    assert repository.get_memory("user-a", created.id) == created

    updated = repository.update_memory(
        "user-a",
        created.id,
        MemoryUpdate(content={"summary": "updated"}),
    )
    assert updated.content == {"summary": "updated"}

    confirmed = repository.set_memory_status("user-a", created.id, "confirmed")
    assert confirmed.status == "confirmed"
    assert confirmed.last_confirmed_at is not None

    stale = repository.set_memory_status("user-a", created.id, "stale")
    assert stale.status == "stale"

    repository.delete_memory("user-a", created.id)
    assert repository.get_memory("user-a", created.id) is None


def test_decision_lifecycle_and_snapshot_is_immutable(
    repository: MemoryRepository,
) -> None:
    memory = repository.create_memory(
        "user-a",
        MemoryCreate(
            memory_type="goal",
            content={"summary": "ship the MVP"},
            source_refs=[source()],
            confidence=0.9,
        ),
    )
    repository.set_memory_status("user-a", memory.id, "confirmed")

    decision = repository.create_decision(
        "user-a",
        DecisionRecordCreate(
            thread_id="thread-1",
            question="Which issue is next?",
            recommendation={"issue": 5},
            confidence=85,
        ),
    )
    frozen_snapshot = decision.context_snapshot

    repository.update_memory(
        "user-a",
        memory.id,
        MemoryUpdate(content={"summary": "changed later"}),
    )
    updated = repository.update_decision(
        "user-a",
        decision.id,
        DecisionRecordUpdate(outcome={"result": "done"}, review_status="confirmed"),
    )

    assert updated.context_snapshot == frozen_snapshot
    assert updated.outcome == {"result": "done"}
    assert repository.get_decision("user-a", decision.id) == updated

    stale = repository.update_decision(
        "user-a",
        decision.id,
        DecisionRecordUpdate(review_status="stale"),
    )
    assert stale.review_status == "stale"

    with pytest.raises(ValidationError):
        DecisionRecordUpdate.model_validate({"context_snapshot": {"tampered": True}})

    repository.delete_decision("user-a", decision.id)
    assert repository.get_decision("user-a", decision.id) is None


def test_memory_requires_source_and_starts_as_candidate() -> None:
    with pytest.raises(ValidationError):
        MemoryCreate(
            memory_type="goal",
            content={"summary": "missing source"},
            source_refs=[],
            confidence=0.5,
        )

    with pytest.raises(ValidationError):
        MemoryCreate.model_validate(
            {
                "memory_type": "goal",
                "content": {"summary": "not user-confirmed"},
                "source_refs": [source().model_dump()],
                "confidence": 0.5,
                "status": "confirmed",
            }
        )


def test_conflicting_memories_are_not_silently_overwritten(
    repository: MemoryRepository,
) -> None:
    for summary in ("优先做记忆", "优先做界面"):
        repository.create_memory(
            "user-a",
            MemoryCreate(
                memory_type="goal",
                content={"summary": summary, "topic": "next issue"},
                source_refs=[source(summary)],
                confidence=0.7,
            ),
        )

    results = repository.search_memories("user-a", query="next issue")

    assert {item.content["summary"] for item in results} == {
        "优先做记忆",
        "优先做界面",
    }


def test_search_combines_type_time_status_and_keyword_filters(
    repository: MemoryRepository,
) -> None:
    old = datetime.now(UTC) - timedelta(days=120)
    recent = datetime.now(UTC) - timedelta(days=1)
    for memory_type, summary, valid_from in (
        ("goal", "ship memory baseline", recent),
        ("matter", "ship UI baseline", recent),
        ("goal", "ship legacy baseline", old),
    ):
        item = repository.create_memory(
            "user-a",
            MemoryCreate(
                memory_type=memory_type,
                content={"summary": summary},
                source_refs=[source(summary)],
                confidence=0.8,
                valid_from=valid_from,
            ),
        )
        repository.set_memory_status("user-a", item.id, "confirmed")

    results = repository.search_memories(
        "user-a",
        query="ship",
        memory_type="goal",
        statuses=["confirmed"],
        valid_from=datetime.now(UTC) - timedelta(days=90),
    )

    assert [item.content["summary"] for item in results] == [
        "ship memory baseline"
    ]


def test_context_snapshot_is_user_scoped_and_limited_to_twenty(
    repository: MemoryRepository,
) -> None:
    for index in range(22):
        item = repository.create_memory(
            "user-a",
            MemoryCreate(
                memory_type="goal",
                content={"summary": f"goal {index}"},
                source_refs=[source(f"a-{index}")],
                confidence=0.8,
            ),
        )
        repository.set_memory_status("user-a", item.id, "confirmed")
    repository.create_memory(
        "user-b",
        MemoryCreate(
            memory_type="pattern",
            content={"summary": "private user-b pattern"},
            source_refs=[source("b-1")],
            confidence=0.9,
        ),
    )

    snapshot = repository.build_context_snapshot("user-a")
    refs = [*snapshot.goals, *snapshot.matters, *snapshot.decisions, *snapshot.patterns]

    assert len(refs) == 20
    assert all(ref.user_id == "user-a" for ref in refs)
    assert "private user-b pattern" not in str(snapshot.model_dump())


def test_cross_user_reads_and_writes_are_isolated(
    repository: MemoryRepository,
) -> None:
    item = repository.create_memory(
        "user-a",
        MemoryCreate(
            memory_type="matter",
            content={"summary": "user-a only"},
            source_refs=[source()],
            confidence=0.8,
        ),
    )

    assert repository.get_memory("user-b", item.id) is None
    assert repository.search_memories("user-b") == []
    with pytest.raises(KeyError):
        repository.update_memory(
            "user-b",
            item.id,
            MemoryUpdate(content={"summary": "stolen"}),
        )
    with pytest.raises(KeyError):
        repository.delete_memory("user-b", item.id)

    decision = repository.create_decision(
        "user-a",
        DecisionRecordCreate(thread_id="thread-a", question="private decision"),
    )
    assert repository.get_decision("user-b", decision.id) is None
    with pytest.raises(KeyError):
        repository.update_decision(
            "user-b",
            decision.id,
            DecisionRecordUpdate(review_status="stale"),
        )
