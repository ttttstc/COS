"""Custom memory routes mounted into the existing LangGraph HTTP server."""

from datetime import datetime
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status

from lyl_agent.memory import (
    DecisionRecord,
    DecisionRecordCreate,
    DecisionRecordUpdate,
    DecisionStatus,
    MemoryCreate,
    MemoryItem,
    MemoryRepository,
    MemoryStatus,
    MemoryType,
    MemoryUpdate,
)
from lyl_agent.settings import load_settings


@lru_cache(maxsize=1)
def default_repository() -> MemoryRepository:
    return MemoryRepository(load_settings().memory_db_path)


def require_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    if x_user_id is None or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-ID header is required.",
        )
    return x_user_id.strip()


def create_app(repository: MemoryRepository | None = None) -> FastAPI:
    custom_app = FastAPI(title="LYL Memory API")

    def get_repository() -> MemoryRepository:
        return repository or default_repository()

    Repository = Annotated[MemoryRepository, Depends(get_repository)]
    UserId = Annotated[str, Depends(require_user_id)]

    @custom_app.get("/memories", response_model=list[MemoryItem])
    def list_memories(
        repository: Repository,
        user_id: UserId,
        query: str | None = None,
        memory_type: MemoryType | None = None,
        memory_status: Annotated[list[MemoryStatus] | None, Query(alias="status")] = None,
        valid_from: datetime | None = None,
        valid_until: datetime | None = None,
        limit: Annotated[int, Query(ge=1, le=100)] = 100,
    ) -> list[MemoryItem]:
        return repository.search_memories(
            user_id,
            query=query,
            memory_type=memory_type,
            statuses=memory_status,
            valid_from=valid_from,
            valid_until=valid_until,
            limit=limit,
        )

    @custom_app.post(
        "/memories",
        response_model=MemoryItem,
        status_code=status.HTTP_201_CREATED,
    )
    def create_memory(
        item: MemoryCreate,
        repository: Repository,
        user_id: UserId,
    ) -> MemoryItem:
        return repository.create_memory(user_id, item)

    @custom_app.get("/memories/{item_id}", response_model=MemoryItem)
    def get_memory(
        item_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> MemoryItem:
        item = repository.get_memory(user_id, item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Memory not found.")
        return item

    @custom_app.patch("/memories/{item_id}", response_model=MemoryItem)
    def update_memory(
        item_id: str,
        update: MemoryUpdate,
        repository: Repository,
        user_id: UserId,
    ) -> MemoryItem:
        try:
            return repository.update_memory(user_id, item_id, update)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Memory not found.") from error

    @custom_app.delete(
        "/memories/{item_id}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    def delete_memory(
        item_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> Response:
        try:
            repository.delete_memory(user_id, item_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Memory not found.") from error
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @custom_app.post("/memories/{item_id}/confirm", response_model=MemoryItem)
    def confirm_memory(
        item_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> MemoryItem:
        try:
            return repository.set_memory_status(user_id, item_id, "confirmed")
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Memory not found.") from error

    @custom_app.post("/memories/{item_id}/reject", response_model=MemoryItem)
    def reject_memory(
        item_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> MemoryItem:
        try:
            return repository.set_memory_status(user_id, item_id, "rejected")
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Memory not found.") from error

    @custom_app.get("/decisions", response_model=list[DecisionRecord])
    def list_decisions(
        repository: Repository,
        user_id: UserId,
        query: str | None = None,
        review_status: Annotated[
            list[DecisionStatus] | None,
            Query(alias="status"),
        ] = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        limit: Annotated[int, Query(ge=1, le=100)] = 100,
    ) -> list[DecisionRecord]:
        return repository.search_decisions(
            user_id,
            query=query,
            statuses=review_status,
            created_from=created_from,
            created_to=created_to,
            limit=limit,
        )

    @custom_app.post(
        "/decisions",
        response_model=DecisionRecord,
        status_code=status.HTTP_201_CREATED,
    )
    def create_decision(
        decision: DecisionRecordCreate,
        repository: Repository,
        user_id: UserId,
    ) -> DecisionRecord:
        try:
            return repository.create_decision(user_id, decision)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @custom_app.get("/decisions/{decision_id}", response_model=DecisionRecord)
    def get_decision(
        decision_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> DecisionRecord:
        decision = repository.get_decision(user_id, decision_id)
        if decision is None:
            raise HTTPException(status_code=404, detail="Decision not found.")
        return decision

    @custom_app.patch("/decisions/{decision_id}", response_model=DecisionRecord)
    def update_decision(
        decision_id: str,
        update: DecisionRecordUpdate,
        repository: Repository,
        user_id: UserId,
    ) -> DecisionRecord:
        try:
            return repository.update_decision(user_id, decision_id, update)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Decision not found.") from error

    @custom_app.delete(
        "/decisions/{decision_id}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    def delete_decision(
        decision_id: str,
        repository: Repository,
        user_id: UserId,
    ) -> Response:
        try:
            repository.delete_decision(user_id, decision_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Decision not found.") from error
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return custom_app


app = create_app()
