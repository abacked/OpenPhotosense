# API

## `POST /api/v1/scans`

Accepts multipart form data with a `video` field. Supported extensions are MP4, MOV, AVI, MKV, WebM, and M4V. Returns `202 Accepted`:

```json
{ "job_id": "e4d…", "status": "queued" }
```

## `GET /api/v1/scans/{job_id}`

Returns job status and progress from 0–100. A completed response includes `report`; a failed response includes `error`.

## `GET /health`

Returns `{ "status": "ok" }` for container health checks.

Uploads are deleted after completion or failure. Job reports are currently process-local and disappear on restart. Production multi-instance deployments should replace `JobManager` with durable object storage and a queue such as Redis/Celery.

