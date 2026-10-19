import io
import uuid
import hashlib
from typing import Optional, Literal
from PIL import Image, ImageOps
from fastapi import UploadFile, HTTPException, status
from loguru import logger
from app.services.storage_service import storage_service

VALID_MIME_TYPES = {
    "image/jpeg", 
    "image/jpg", 
    "image/png", 
    "image/webp", 
    "image/bmp", 
    "image/tiff"
}

def compress_and_convert_to_webp(
    image_bytes: bytes,
    max_dimension: Optional[int] = 1600,
    quality: int = 82
) -> bytes:
    """
    In-memory image processing pipeline:
    - Auto-corrects EXIF orientation.
    - Preserves alpha channel if present (PNG/WebP) or converts to RGB.
    - Proportionally scales down to max_dimension if larger.
    - Compresses directly to WebP format without writing to server disk.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            
            # Preserve transparency if RGBA, otherwise RGB
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            # Proportionally resize if image exceeds max dimension
            if max_dimension and (img.width > max_dimension or img.height > max_dimension):
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            output_buffer = io.BytesIO()
            img.save(
                output_buffer,
                format="WEBP",
                quality=quality,
                method=6,
                optimize=True
            )
            return output_buffer.getvalue()

    except Exception as e:
        logger.error(f"Error processing image to WebP: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No se pudo procesar y optimizar la imagen: {str(e)}"
        )


async def process_and_upload_image(
    file: UploadFile,
    tenant_id: str = "default",
    category: str = "catalog",
    is_public: bool = True,
    file_id: Optional[str] = None,
    old_file_key: Optional[str] = None
) -> dict:
    """
    Main CMS pipeline for processing and uploading an image directly to Cloudflare R2:
    - Validates MIME type.
    - Transforms in-memory to .webp with optimized compression.
    - Routes key according to bucket hierarchy:
      * Public:  public/{tenant_id}/{tipo}/{archivo_id}.webp
      * Private: private/{tenant_id}/{archivo_id}_{hash}.webp
    - Deletes previous image if old_file_key is provided.
    - Returns metadata including URL and storage key.
    """
    if file.content_type not in VALID_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no admitido. Formatos permitidos: JPG, PNG, WebP, BMP, TIFF."
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo proporcionado está vacío."
        )

    # Convert and compress to WebP in memory
    webp_bytes = compress_and_convert_to_webp(raw_bytes, max_dimension=1600, quality=82)
    clean_tenant = tenant_id.strip() or "default"
    clean_category = category.strip() or "catalog"
    target_id = file_id or uuid.uuid4().hex[:12]

    if is_public:
        # Hierarchical structure: public/{tenant_id}/{tipo}/{archivo_id}.webp
        key = f"public/{clean_tenant}/{clean_category}/{target_id}.webp"
        public_url = storage_service.upload_file(webp_bytes, key, content_type="image/webp")
        result = {
            "key": key,
            "url": public_url,
            "is_public": True,
            "format": "webp",
            "size_bytes": len(webp_bytes)
        }
    else:
        # Hierarchical structure: private/{tenant_id}/{pago_id}_{hash}.webp
        hash_suffix = hashlib.sha256(webp_bytes).hexdigest()[:8]
        key = f"private/{clean_tenant}/{target_id}_{hash_suffix}.webp"
        storage_service.upload_file(webp_bytes, key, content_type="image/webp")
        presigned_url = storage_service.generate_presigned_url(key, expires_in=900)
        result = {
            "key": key,
            "presigned_url": presigned_url,
            "is_public": False,
            "expires_in": 900,
            "format": "webp",
            "size_bytes": len(webp_bytes)
        }

    # Clean up old file if requested
    if old_file_key:
        storage_service.delete_file(old_file_key)

    return result


# -------------------------------------------------------------
# Payment Method Image Helpers (Backward Compatible & R2-backed)
# -------------------------------------------------------------
async def save_and_process_payment_method_image(
    file: UploadFile,
    old_image_id: Optional[str] = None,
    tenant_id: str = "system"
) -> str:
    """Processes payment method logos and stores them in public R2 bucket."""
    res = await process_and_upload_image(
        file=file,
        tenant_id=tenant_id,
        category="payment_methods",
        is_public=True,
        old_file_key=old_image_id
    )
    return res["url"]


def delete_payment_method_images(image_key_or_url: Optional[str]) -> None:
    """Deletes payment method logo from Cloudflare R2 bucket."""
    if image_key_or_url:
        storage_service.delete_file(image_key_or_url)
