import io
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from loguru import logger
from fastapi import HTTPException, status
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_domain_url = settings.R2_PUBLIC_DOMAIN_URL.rstrip('/')
        self.default_expires_in = settings.R2_PRESIGNED_URL_EXPIRES_IN
        self._s3_client = None

    @property
    def client(self):
        """Lazy-loaded boto3 S3 client configured for Cloudflare R2."""
        if self._s3_client is None:
            # Check if R2 credentials are configured
            has_credentials = bool(settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY)
            
            if not has_credentials:
                logger.warning(
                    "Cloudflare R2 credentials (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY) not found. "
                    "Running in simulated/mock storage mode for local development."
                )
                return None

            try:
                self._s3_client = boto3.client(
                    service_name="s3",
                    endpoint_url=settings.CLOUDFLARE_R2_ENDPOINT,
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    region_name="auto",
                    config=Config(
                        signature_version="s3v4",
                        retries={"max_attempts": 3, "mode": "standard"}
                    )
                )
                logger.info(f"Connected to Cloudflare R2 bucket: {self.bucket_name} ({settings.CLOUDFLARE_R2_ENDPOINT})")
            except Exception as e:
                logger.error(f"Failed to initialize Cloudflare R2 S3 client: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error interno al inicializar el servicio de almacenamiento Cloudflare R2."
                )
        return self._s3_client

    def upload_file(self, file_bytes: bytes, key: str, content_type: str = "image/webp") -> str:
        """
        Uploads file bytes directly to Cloudflare R2 without local disk persistence.
        Returns the public URL (if public) or the resource key (if private).
        """
        clean_key = key.lstrip('/')
        s3 = self.client

        if s3 is None:
            # Development fallback simulation
            logger.info(f"[SIMULATED R2 UPLOAD] Key: {clean_key} | Content-Type: {content_type} | Size: {len(file_bytes)} bytes")
            if clean_key.startswith("public/"):
                return f"{self.public_domain_url}/{clean_key}"
            return clean_key

        try:
            s3.put_object(
                Bucket=self.bucket_name,
                Key=clean_key,
                Body=file_bytes,
                ContentType=content_type,
                CacheControl="public, max-age=31536000, immutable" if clean_key.startswith("public/") else "private, no-cache"
            )
            logger.info(f"Successfully uploaded to R2: s3://{self.bucket_name}/{clean_key} ({len(file_bytes)} bytes)")
            
            if clean_key.startswith("public/"):
                return f"{self.public_domain_url}/{clean_key}"
            return clean_key

        except (ClientError, BotoCoreError) as err:
            logger.error(f"Cloudflare R2 Upload Error for key '{clean_key}': {err}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Fallo de conexión o cuota al persistir archivo en Cloudflare R2: {str(err)}"
            )

    def delete_file(self, key: str) -> bool:
        """
        Deletes an object by key from Cloudflare R2 bucket.
        """
        clean_key = key.lstrip('/')
        # If full public domain URL was passed, extract key
        if self.public_domain_url in clean_key:
            clean_key = clean_key.replace(f"{self.public_domain_url}/", "")

        s3 = self.client
        if s3 is None:
            logger.info(f"[SIMULATED R2 DELETE] Key: {clean_key}")
            return True

        try:
            s3.delete_object(Bucket=self.bucket_name, Key=clean_key)
            logger.info(f"Successfully deleted from R2: s3://{self.bucket_name}/{clean_key}")
            return True
        except (ClientError, BotoCoreError) as err:
            logger.error(f"Cloudflare R2 Delete Error for key '{clean_key}': {err}")
            return False

    def generate_presigned_url(self, key: str, expires_in: Optional[int] = None) -> str:
        """
        Generates a temporary presigned URL for private assets (payment receipts, audit docs).
        Default expiration is 900 seconds (15 minutes).
        """
        clean_key = key.lstrip('/')
        exp = expires_in or self.default_expires_in
        s3 = self.client

        if s3 is None:
            # Development fallback simulation
            return f"https://mock-presigned.r2.cloudflarestorage.com/{self.bucket_name}/{clean_key}?expires={exp}"

        try:
            url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": clean_key},
                ExpiresIn=exp
            )
            logger.info(f"Generated presigned URL for key '{clean_key}' (valid for {exp}s)")
            return url
        except (ClientError, BotoCoreError) as err:
            logger.error(f"Cloudflare R2 Presigned URL Generation Error for key '{clean_key}': {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo generar la URL prefirmada de acceso seguro."
            )

    def get_public_url(self, key: str) -> str:
        """Constructs the absolute CDN/custom domain public URL for an asset."""
        clean_key = key.lstrip('/')
        return f"{self.public_domain_url}/{clean_key}"


storage_service = StorageService()
