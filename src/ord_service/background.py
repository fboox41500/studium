from __future__ import annotations

import json
import time
import uuid
from typing import Any, Dict, Optional

import fakeredis

STATUS_FIELD = "status"
RESULT_FIELD = "result"
ERROR_FIELD = "error"
TASK_KEY_PREFIX = "ord:task"


class TaskManager:
    """Manage background task lifecycle using an in-memory Redis substitute."""

    def __init__(self, redis_client: Optional[fakeredis.FakeStrictRedis] = None) -> None:
        self._redis = redis_client or fakeredis.FakeStrictRedis(decode_responses=True)

    def _task_key(self, task_id: str) -> str:
        return f"{TASK_KEY_PREFIX}:{task_id}"

    def create_task(self, *, dataset_id: str, reaction_ids: Optional[list[str]] = None) -> str:
        task_id = str(uuid.uuid4())
        payload = {
            STATUS_FIELD: "pending",
            RESULT_FIELD: json.dumps({
                "dataset_id": dataset_id,
                "reaction_ids": reaction_ids or [],
                "processed_count": 0,
            }),
            ERROR_FIELD: "",
        }
        self._redis.hset(self._task_key(task_id), mapping=payload)
        return task_id

    def process_task(self, task_id: str) -> None:
        key = self._task_key(task_id)
        try:
            self._redis.hset(key, STATUS_FIELD, "running")
            time.sleep(0.05)
            raw_result = self._redis.hget(key, RESULT_FIELD) or "{}"
            result = json.loads(raw_result)
            reaction_ids = result.get("reaction_ids", [])
            result["processed_count"] = len(reaction_ids)
            self._redis.hset(key, RESULT_FIELD, json.dumps(result))
            self._redis.hset(key, STATUS_FIELD, "completed")
        except Exception as exc:  # pragma: no cover - defensive programming
            self._redis.hset(key, STATUS_FIELD, "failed")
            self._redis.hset(key, ERROR_FIELD, str(exc))

    def get_status(self, task_id: str) -> Dict[str, Any]:
        data = self._redis.hgetall(self._task_key(task_id))
        if not data:
            raise KeyError(task_id)

        result = json.loads(data.get(RESULT_FIELD, "{}"))
        error = data.get(ERROR_FIELD) or None
        status = data.get(STATUS_FIELD, "unknown")
        return {"task_id": task_id, "status": status, "result": result, "error": error}
