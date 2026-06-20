from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from scanner.engine import VideoScanner
from scanner.fixer import FixStrategy, VideoFixer


@dataclass
class ScanJob:
    id: str
    filename: str
    path: Path
    status: str = "queued"
    progress: int = 0
    report: dict[str, Any] | None = None
    error: str | None = None


@dataclass
class FixJob:
    id: str
    scan_id: str
    strategy: FixStrategy
    path: Path
    status: str = "queued"
    progress: int = 0
    error: str | None = None


class JobManager:
    """In-process job manager. The interface can be replaced by Redis/Celery later."""

    def __init__(self, workers: int = 2) -> None:
        self.jobs: dict[str, ScanJob] = {}
        self.fixes: dict[str, FixJob] = {}
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

    def create_fix(self, scan: ScanJob, strategy: FixStrategy) -> FixJob:
        fix_id = uuid4().hex
        fix = FixJob(fix_id, scan.id, strategy, scan.path.with_name(f"{fix_id}-safer.mp4"))
        self.fixes[fix.id] = fix
        return fix

    def get_fix(self, fix_id: str) -> FixJob | None:
        return self.fixes.get(fix_id)

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

    async def run_fix(self, fix: FixJob) -> None:
        scan = self.jobs[fix.scan_id]
        fix.status = "processing"
        loop = asyncio.get_running_loop()

        def update_progress(value: float) -> None:
            fix.progress = round(value * 100)

        try:
            await loop.run_in_executor(
                self.executor,
                lambda: VideoFixer().generate(
                    scan.path, fix.path, scan.report or {}, fix.strategy, update_progress
                ),
            )
            fix.status = "completed"
            fix.progress = 100
        except Exception as exc:
            fix.status = "failed"
            fix.error = str(exc)

    def shutdown(self) -> None:
        self.executor.shutdown(wait=False, cancel_futures=True)
        for job in self.jobs.values():
            job.path.unlink(missing_ok=True)
        for fix in self.fixes.values():
            fix.path.unlink(missing_ok=True)
