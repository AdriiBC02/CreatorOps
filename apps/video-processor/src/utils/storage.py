import os
import uuid
import boto3
from botocore.config import Config
import httpx

from config import get_settings

settings = get_settings()


class StorageClient:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            endpoint_url=f"http{'s' if settings.minio_use_ssl else ''}://{settings.minio_endpoint}:{settings.minio_port}",
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self.bucket = settings.minio_bucket

    async def download_temp(self, url: str) -> str:
        """Download file from URL to temp directory."""
        os.makedirs(settings.temp_dir, exist_ok=True)

        # Generate temp filename
        ext = url.split(".")[-1].split("?")[0]
        temp_path = f"{settings.temp_dir}/{uuid.uuid4()}.{ext}"

        if url.startswith(("http://", "https://")):
            # Download from HTTP(S)
            async with httpx.AsyncClient() as client:
                response = await client.get(url, follow_redirects=True, timeout=300)
                response.raise_for_status()

                with open(temp_path, "wb") as f:
                    f.write(response.content)
        else:
            # Assume it's an S3 key
            self.s3.download_file(self.bucket, url, temp_path)

        return temp_path

    async def upload(self, local_path: str, remote_key: str) -> str:
        """Upload file to S3/MinIO."""
        # Determine content type
        ext = local_path.split(".")[-1].lower()
        content_types = {
            "mp4": "video/mp4",
            "webm": "video/webm",
            "mov": "video/quicktime",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "srt": "text/plain",
            "vtt": "text/vtt",
            "json": "application/json",
        }
        content_type = content_types.get(ext, "application/octet-stream")

        self.s3.upload_file(
            local_path,
            self.bucket,
            remote_key,
            ExtraArgs={"ContentType": content_type},
        )

        # Return URL
        protocol = "https" if settings.minio_use_ssl else "http"
        return f"{protocol}://{settings.minio_endpoint}:{settings.minio_port}/{self.bucket}/{remote_key}"

    async def delete(self, remote_key: str):
        """Delete file from S3/MinIO."""
        self.s3.delete_object(Bucket=self.bucket, Key=remote_key)

    def get_presigned_url(self, remote_key: str, expires_in: int = 3600) -> str:
        """Get presigned URL for downloading."""
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": remote_key},
            ExpiresIn=expires_in,
        )
