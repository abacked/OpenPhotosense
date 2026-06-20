# API

## `POST /api/v1/scans`

Accepts multipart form data with a `video` field. Supported extensions are MP4, MOV, AVI, MKV, WebM, and M4V. Returns `202 Accepted`:

```json
{ "job_id": "e4d…", "status": "queued" }
```

## `GET /api/v1/scans/{job_id}`

Returns job status and progress from 0–100. A completed response includes `report`; a failed response includes `error`.

## `POST /api/v1/scans/{job_id}/fixes`

Queues a safer derivative after a scan completes. Send a JSON body with a `smooth`, `dim`, or `remove` strategy. Returns `202 Accepted` with a `fix_id`.

## `GET /api/v1/fixes/{fix_id}`

Returns Auto-fix status, progress, the selected strategy, and a download URL when complete.

## `GET /api/v1/fixes/{fix_id}/download`

Downloads the generated MP4. Auto-fix outputs are derivatives and still require human review.

## `GET /health`

Returns `{ "status": "ok" }` for container health checks.

Uploads and generated files are retained only for the life of the server process so completed scans can be fixed and downloaded. Job reports are process-local and disappear on restart. Production multi-instance deployments should replace `JobManager` with expiring object storage and a durable queue such as Redis/Celery.
