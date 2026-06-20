from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    max_upload_mb: int = 500
    upload_dir: Path = Path("uploads")
    cors_origins: str = "http://localhost:3000"
    workers: int = 2

    model_config = SettingsConfigDict(env_prefix="OPENPHOTOSENSE_", env_file=".env")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

