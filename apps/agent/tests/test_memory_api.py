from datetime import UTC, datetime

from fastapi.testclient import TestClient

from lyl_agent.api import create_app
from lyl_agent.memory import MemoryCreate, MemoryRepository, SourceRef


def test_memory_api_requires_user_and_keeps_tenants_isolated(tmp_path: object) -> None:
    repository = MemoryRepository(tmp_path / "api.sqlite3")  # type: ignore[operator]
    client = TestClient(create_app(repository))
    payload = {
        "memory_type": "goal",
        "content": {"summary": "ship issue five"},
        "source_refs": [
            {
                "source_type": "chat",
                "source_id": "message-1",
                "observed_at": datetime.now(UTC).isoformat(),
            }
        ],
        "confidence": 0.9,
    }

    assert client.get("/memories").status_code == 400

    created = client.post(
        "/memories",
        headers={"X-User-ID": "user-a"},
        json=payload,
    )
    assert created.status_code == 201
    memory_id = created.json()["id"]
    assert created.json()["status"] == "candidate"

    confirmed = client.post(
        f"/memories/{memory_id}/confirm",
        headers={"X-User-ID": "user-a"},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    stale = client.patch(
        f"/memories/{memory_id}",
        headers={"X-User-ID": "user-a"},
        json={"status": "stale"},
    )
    assert stale.status_code == 200
    assert stale.json()["status"] == "stale"

    invalid = client.patch(
        f"/memories/{memory_id}",
        headers={"X-User-ID": "user-a"},
        json={"content": None},
    )
    assert invalid.status_code == 422

    assert client.get(
        f"/memories/{memory_id}",
        headers={"X-User-ID": "user-b"},
    ).status_code == 404
    assert client.get(
        "/memories",
        headers={"X-User-ID": "user-b"},
    ).json() == []

    deleted = client.delete(
        f"/memories/{memory_id}",
        headers={"X-User-ID": "user-a"},
    )
    assert deleted.status_code == 204


def test_decision_api_exposes_frozen_context_snapshot(tmp_path: object) -> None:
    repository = MemoryRepository(tmp_path / "api.sqlite3")  # type: ignore[operator]
    client = TestClient(create_app(repository))
    headers = {"X-User-ID": "user-a"}

    created = client.post(
        "/decisions",
        headers=headers,
        json={
            "thread_id": "thread-1",
            "question": "What next?",
            "recommendation": {"issue": 5},
            "confidence": 80,
        },
    )

    assert created.status_code == 201
    decision = created.json()
    assert decision["context_snapshot"]["generated_at"]

    tampered = client.patch(
        f"/decisions/{decision['id']}",
        headers=headers,
        json={"context_snapshot": {"tampered": True}},
    )
    assert tampered.status_code == 422

    loaded = client.get(f"/decisions/{decision['id']}", headers=headers)
    assert loaded.json()["context_snapshot"] == decision["context_snapshot"]


def test_decision_api_rejects_cross_user_snapshot_refs(tmp_path: object) -> None:
    repository = MemoryRepository(tmp_path / "api.sqlite3")  # type: ignore[operator]
    foreign = repository.create_memory(
        "user-b",
        MemoryCreate(
            memory_type="goal",
            content={"summary": "private"},
            source_refs=[
                SourceRef(source_type="chat", source_id="user-b-message")
            ],
            confidence=0.9,
        ),
    )
    repository.set_memory_status("user-b", foreign.id, "confirmed")
    snapshot = repository.build_context_snapshot("user-b")
    client = TestClient(create_app(repository))

    response = client.post(
        "/decisions",
        headers={"X-User-ID": "user-a"},
        json={
            "thread_id": "thread-a",
            "question": "Attempt cross-user snapshot",
            "context_snapshot": snapshot.model_dump(mode="json"),
        },
    )

    assert response.status_code == 422
