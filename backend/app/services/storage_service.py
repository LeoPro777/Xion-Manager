import io
import os
import re
from typing import Optional, List, Dict, Any
from loguru import logger
from fastapi import HTTPException, status
from app.core.config import settings

class SupabaseStorageService:
    """
    Production-ready Storage Service integrated with Supabase Storage.
    - Zero local disk persistence (operates 100% in memory with BytesIO).
    - Uses official supabase-py client authenticated via SUPABASE_SERVICE_ROLE_KEY.
    - Enforces content-type 'image/webp' and immutable CDN caching headers.
    - Provides automatic path extraction, bucket auto-provisioning, and orphan cleanup.
    - Supports graceful local/mock fallback for offline development.
    """

    def __init__(self):
        self.bucket_name = settings.SUPABASE_STORAGE_BUCKET or "xion-media"
        self._supabase_client = None
        self._bucket_ensured = False

    @property
    def client(self):
        """Lazy-loaded official Supabase client."""
        if self._supabase_client is None:
            url = settings.SUPABASE_URL
            key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY

            if not url or not key:
                logger.warning(
                    "Supabase Storage credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) not configured. "
                    "Running in simulated/mock storage mode for local development."
                )
                return None

            try:
                from supabase import create_client, Client
                self._supabase_client = create_client(url, key)
                logger.info(f"Connected to Supabase Storage at: {url} | Bucket: '{self.bucket_name}'")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                return None

        return self._supabase_client

    def _ensure_bucket(self):
        """Idempotently ensures that the target storage bucket exists and is public."""
        if self._bucket_ensured:
            return
        client = self.client
        if client is None:
            return

        try:
            # Check or create bucket with public read access
            client.storage.create_bucket(
                id=self.bucket_name,
                options={"public": True, "file_size_limit": settings.SUPABASE_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024}
            )
            logger.info(f"Supabase Storage bucket '{self.bucket_name}' verified/created as public.")
            self._bucket_ensured = True
        except Exception as e:
            # Bucket might already exist, which is expected
            err_msg = str(e).lower()
            if "already exists" in err_msg or "duplicate" in err_msg or "409" in err_msg:
                self._bucket_ensured = True
            else:
                logger.warning(f"Note during bucket verification '{self.bucket_name}': {e}")
                self._bucket_ensured = True

    def extract_storage_path(self, path_or_url: str) -> str:
        """
        Extracts clean bucket storage path from full Supabase URLs or relative keys.
        Example:
          https://xyz.supabase.co/storage/v1/object/public/xion-media/products/item.webp
          -> products/item.webp
        """
        if not path_or_url:
            return ""

        clean = path_or_url.strip()

        # Handle Supabase public URL structure
        target_pattern = f"/storage/v1/object/public/{self.bucket_name}/"
        if target_pattern in clean:
            return clean.split(target_pattern, 1)[1]

        # Handle alternate path format /<bucket>/
        bucket_prefix = f"/{self.bucket_name}/"
        if bucket_prefix in clean:
            return clean.split(bucket_prefix, 1)[1]

        # Handle full external URLs
        if clean.startswith("http://") or clean.startswith("https://"):
            parts = clean.split("/")
            if self.bucket_name in parts:
                idx = parts.index(self.bucket_name)
                return "/".join(parts[idx + 1:])
            return parts[-1]

        return clean.lstrip("/")

    def upload_file(
        self,
        file_bytes: bytes,
        path: str,
        content_type: str = "image/webp",
        cache_control: str = "public, max-age=31536000"
    ) -> str:
        """
        Uploads in-memory image bytes directly to Supabase Storage.
        Returns the absolute public URL of the uploaded asset.
        """
        clean_path = self.extract_storage_path(path)
        client = self.client

        if client is None:
            # Fallback simulated response for local offline development
            base_url = (settings.SUPABASE_URL or "https://mock.supabase.co").rstrip("/")
            mock_url = f"{base_url}/storage/v1/object/public/{self.bucket_name}/{clean_path}"
            logger.info(f"[SIMULATED SUPABASE UPLOAD] Path: {clean_path} | Size: {len(file_bytes)} bytes | URL: {mock_url}")
            return mock_url

        self._ensure_bucket()
        try:
            bucket = client.storage.from_(self.bucket_name)
            bucket.upload(
                path=clean_path,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "cache-control": cache_control,
                    "upsert": "true"
                }
            )
            public_url = bucket.get_public_url(clean_path)
            logger.info(f"Successfully uploaded to Supabase Storage: {clean_path} ({len(file_bytes)} bytes)")
            return public_url

        except Exception as e:
            logger.error(f"Error uploading '{clean_path}' to Supabase Storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al persistir la imagen en Supabase Storage: {str(e)}"
            )

    def get_public_url(self, path: str) -> str:
        """Generates the absolute public CDN URL for a given storage path."""
        clean_path = self.extract_storage_path(path)
        client = self.client
        if client is not None:
            return client.storage.from_(self.bucket_name).get_public_url(clean_path)

        base_url = (settings.SUPABASE_URL or "https://mock.supabase.co").rstrip("/")
        return f"{base_url}/storage/v1/object/public/{self.bucket_name}/{clean_path}"

    def generate_presigned_url(self, path_or_url: str, expires_in: int = 900) -> str:
        """
        Generates a temporary signed URL for private or sensitive assets.
        Default expiration: 15 minutes (900 seconds).
        """
        clean_path = self.extract_storage_path(path_or_url)
        client = self.client

        if client is None:
            base_url = (settings.SUPABASE_URL or "https://mock.supabase.co").rstrip("/")
            return f"{base_url}/storage/v1/object/sign/{self.bucket_name}/{clean_path}?token=mock-token&expires={expires_in}"

        try:
            res = client.storage.from_(self.bucket_name).create_signed_url(clean_path, expires_in)
            if isinstance(res, dict) and "signedURL" in res:
                return res["signedURL"]
            return str(res)
        except Exception as e:
            logger.error(f"Error generating signed URL for '{clean_path}': {e}")
            # Fallback to public URL if signed generation fails
            return self.get_public_url(clean_path)

    def delete_file(self, path_or_url: Optional[str]) -> bool:
        """
        Safely deletes an object from Supabase Storage.
        Also handles backward compatibility for legacy local disk paths safely.
        """
        if not path_or_url:
            return True

        # Check if it was a legacy local file
        if path_or_url.startswith("/static/") or path_or_url.startswith("/uploads/") or "uploads/" in path_or_url:
            self._try_delete_local_file(path_or_url)

        clean_path = self.extract_storage_path(path_or_url)
        if not clean_path:
            return True

        client = self.client
        if client is None:
            logger.info(f"[SIMULATED SUPABASE DELETE] Path: {clean_path}")
            return True

        try:
            bucket = client.storage.from_(self.bucket_name)
            bucket.remove([clean_path])
            logger.info(f"Successfully deleted from Supabase Storage: {clean_path}")
            return True
        except Exception as e:
            logger.warning(f"Could not delete '{clean_path}' from Supabase Storage (might not exist): {e}")
            return False

    def delete_files(self, paths_or_urls: List[str]) -> bool:
        """Batch deletes multiple files from Supabase Storage."""
        if not paths_or_urls:
            return True

        clean_paths = []
        for p in paths_or_urls:
            if not p:
                continue
            if p.startswith("/static/") or p.startswith("/uploads/") or "uploads/" in p:
                self._try_delete_local_file(p)
            extracted = self.extract_storage_path(p)
            if extracted:
                clean_paths.append(extracted)

        if not clean_paths:
            return True

        client = self.client
        if client is None:
            logger.info(f"[SIMULATED SUPABASE BATCH DELETE] Paths: {clean_paths}")
            return True

        try:
            bucket = client.storage.from_(self.bucket_name)
            bucket.remove(clean_paths)
            logger.info(f"Successfully batch deleted from Supabase Storage: {clean_paths}")
            return True
        except Exception as e:
            logger.warning(f"Could not batch delete from Supabase Storage: {e}")
            return False

    def _try_delete_local_file(self, local_path: str):
        """Attempts to delete a legacy file from server disk safely without raising exceptions."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidates = [
                os.path.join(base_dir, "data", "uploads", local_path.lstrip("/")),
                os.path.join(base_dir, local_path.lstrip("/")),
                os.path.join(base_dir, "data", local_path.lstrip("/"))
            ]
            for c in candidates:
                if os.path.isfile(c):
                    os.remove(c)
                    logger.info(f"Deleted legacy local file: {c}")
                    break
        except Exception as e:
            logger.debug(f"Legacy local file deletion ignored: {e}")


storage_service = SupabaseStorageService()
