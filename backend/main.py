from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.config import settings
from backend.jobs import JobManager
from backend.schemas import FixCreated, FixRequest, FixStatus, JobCreated, JobStatus
from scanner.fixer import FixStrategy

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
CHUNK_SIZE = 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.state.jobs = JobManager(settings.workers)
    yield
    app.state.jobs.shutdown()


app = FastAPI(
    title="OpenPhotosense API",
    version="0.1.0",
    description="Analyze videos for potential photosensitive accessibility hazards.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/scans", response_model=JobCreated, status_code=status.HTTP_202_ACCEPTED)
async def upload_video(request: Request, video: UploadFile = File(...)) -> JobCreated:
    filename = Path(video.filename or "upload").name
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported video format")

    manager: JobManager = request.app.state.jobs
    job = manager.create(filename, settings.upload_dir, extension)
    temporary_path = job.path
    total = 0
    try:
        with temporary_path.open("wb") as destination:
            while chunk := await video.read(CHUNK_SIZE):
                total += len(chunk)
                if total > settings.max_upload_mb * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="Video exceeds upload size limit")
                destination.write(chunk)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        manager.jobs.pop(job.id, None)
        raise
    finally:
        await video.close()

    asyncio.create_task(manager.run(job))
    return JobCreated(job_id=job.id)


@app.get("/api/v1/scans/{job_id}", response_model=JobStatus)
async def get_scan(request: Request, job_id: str) -> JobStatus:
    manager: JobManager = request.app.state.jobs
    job = manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return JobStatus(
        job_id=job.id,
        status=job.status,  # type: ignore[arg-type]
        progress=job.progress,
        filename=job.filename,
        report=job.report,
        error=job.error,
    )


@app.post("/api/v1/scans/{job_id}/fixes", response_model=FixCreated, status_code=202)
async def create_fix(request: Request, job_id: str, payload: FixRequest) -> FixCreated:
    manager: JobManager = request.app.state.jobs
    scan = manager.get(job_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan job not found")
    if scan.status != "completed" or scan.report is None:
        raise HTTPException(status_code=409, detail="Scan must complete before generating a fix")
    if not scan.path.exists():
        raise HTTPException(status_code=410, detail="The uploaded video is no longer available")
    fix = manager.create_fix(scan, FixStrategy(payload.strategy))
    asyncio.create_task(manager.run_fix(fix))
    return FixCreated(fix_id=fix.id)


@app.get("/api/v1/fixes/{fix_id}", response_model=FixStatus)
async def get_fix(request: Request, fix_id: str) -> FixStatus:
    manager: JobManager = request.app.state.jobs
    fix = manager.get_fix(fix_id)
    if fix is None:
        raise HTTPException(status_code=404, detail="Fix job not found")
    return FixStatus(
        fix_id=fix.id,
        scan_id=fix.scan_id,
        status=fix.status,  # type: ignore[arg-type]
        progress=fix.progress,
        strategy=fix.strategy.value,  # type: ignore[arg-type]
        download_url=f"/api/v1/fixes/{fix.id}/download" if fix.status == "completed" else None,
        error=fix.error,
    )


@app.get("/api/v1/fixes/{fix_id}/download")
async def download_fix(request: Request, fix_id: str) -> FileResponse:
    manager: JobManager = request.app.state.jobs
    fix = manager.get_fix(fix_id)
    if fix is None or fix.status != "completed" or not fix.path.exists():
        raise HTTPException(status_code=404, detail="Safer video is not available")
    scan = manager.get(fix.scan_id)
    stem = Path(scan.filename if scan else "video").stem
    return FileResponse(fix.path, media_type="video/mp4", filename=f"{stem}-safer.mp4")
