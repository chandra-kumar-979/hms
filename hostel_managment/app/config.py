import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
    JWT_ALGORITHM: str = "HS256"
    DEV_AUTH_ENABLED: bool = os.getenv("DEV_AUTH_ENABLED", "true").lower() == "true"
    ACCESS_TOKEN_EXPIRES_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200").split(",")
        if origin.strip()
    ]
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID")
    AWS_ACCESS_KEY: str = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY: str = os.getenv("AWS_SECRET_KEY")
    AWS_BUCKET_NAME: str = os.getenv("AWS_BUCKET_NAME")
    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "mock")
    PAYMENT_PUBLIC_KEY: str | None = os.getenv("PAYMENT_PUBLIC_KEY")
    PAYMENT_SECRET_KEY: str | None = os.getenv("PAYMENT_SECRET_KEY")
    NOTIFICATION_PROVIDER: str = os.getenv("NOTIFICATION_PROVIDER", "mock")
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:4200")

settings = Settings()
