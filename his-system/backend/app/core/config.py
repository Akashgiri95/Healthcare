from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://his_user:his_pass@localhost:5432/his_db"
    SECRET_KEY: str = "change-this-in-production-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours (hospital shift)
    DEBUG: bool = True
    APP_NAME: str = "HIS - Hospital Information System"

    class Config:
        env_file = ".env"


settings = Settings()
