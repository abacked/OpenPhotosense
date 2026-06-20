from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from scanner.engine import VideoScanner


@dataclass
class ScanJob:
    id: str
    filename: str
    path: Path
    status: str = "queued"
    progress: int = 0
    report: dict[str, Any] | None = None
    error: str | None = None


class JobManager:
    """In-process job manager. The interface can be replaced by Redis/Celery later."""

    def __init__(self, workers: int = 2) -> None:
        self.jobs: dict[str, ScanJob] = {}
        self.executor = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="scanner")

    def create(self, filename: str, upload_dir: Path, extension: str) -> ScanJob:
        job_id = uuid4().hex
        job = ScanJob(
            id=job_id,
            filename=filename,
            path=upload_dir / f"{job_id}{extension}",
        )
        self.jobs[job.id] = job
        return job

    def get(self, job_id: str) -> ScanJob | None:
        return self.jobs.get(job_id)

    async def run(self, job: ScanJob) -> None:
        job.status = "processing"
        loop = asyncio.get_running_loop()

        def update_progress(value: float) -> None:
            job.progress = round(value * 100)

        try:
            scanner = VideoScanner()
            report = await loop.run_in_executor(
                self.executor, lambda: scanner.scan(job.path, update_progress)
            )
            job.report = report.to_dict()
            job.status = "completed"
            job.progress = 100
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
        finally:
            job.path.unlink(missing_ok=True)
