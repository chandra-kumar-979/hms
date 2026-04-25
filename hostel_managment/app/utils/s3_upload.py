import boto3
from app.config import settings
import uuid

s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY,
    aws_secret_access_key=settings.AWS_SECRET_KEY
)

def upload_file_to_s3(file, folder: str):
    file_key = f"{folder}/{uuid.uuid4()}.jpg"
    s3.upload_fileobj(file, settings.AWS_BUCKET_NAME, file_key)
    return f"https://{settings.AWS_BUCKET_NAME}.s3.amazonaws.com/{file_key}"
