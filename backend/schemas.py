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


class FixRequest(BaseModel):
    strategy: Literal["smooth", "dim", "remove"]


class FixCreated(BaseModel):
    fix_id: str
    status: Literal["queued"] = "queued"


class FixStatus(BaseModel):
    fix_id: str
    scan_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    strategy: Literal["smooth", "dim", "remove"]
    download_url: Optional[str] = None
    error: Optional[str] = None
