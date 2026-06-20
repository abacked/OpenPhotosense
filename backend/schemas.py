from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class JobCreated(BaseModel):
    job_id: str
    status: Literal["queued"] = "queued"


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    filename: str
    report: Optional[dict[str, Any]] = None
    error: Optional[str] = None
