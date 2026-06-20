"""Launch the development API without relying on a relocated virtualenv script."""

import sys
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000)
