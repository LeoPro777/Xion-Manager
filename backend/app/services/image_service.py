import io
import uuid
import re
import hashlib
from typing import Optional, Dict, Any, List
from PIL import Image, ImageOps
from fastapi import UploadFile, HTTPException, status
from loguru import logger
from app.services.storage_service import storage_service
from app.core.config import settings

VALID_MIME_TYPES = {
    "image/jpeg", 
    "image/png", 
    "image/webp", 
    "image/bmp", 
    "image/tiff"
}

# Image variant specifications by context (max width, max height, quality)
VARIANT_CONFIGS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "products": {
        "medium": {"size": (500, 500), "quality": 80},
        "thumb": {"size": (150, 150), "quality": 75}
    },
    "payment_methods": {
        "medium": {"size": (500, 500), "quality": 80},
        "thumb": {"size": (150, 150), "quality": 75}
    },
    "receipts": {
        "medium": {"size": (1200, 1200), "quality": 80},
        "thumb": {"size": (300, 300), "quality": 75}
    },
    "logos": {
        "medium": {"size": (500, 500), "quality": 85},
        "thumb": {"size": (150, 150), "quality": 75}
    },
    "default": {
        "medium": {"size": (500, 500), "quality": 80},
        "thumb": {"size": (150, 150), "quality": 75}
    }
}


async def validate_and_read_image(
    file: UploadFile,
    max_size_mb: Optional[int] = None
) -> bytes:
    """
    Validates uploaded file:
    - Checks MIME type against allowed image formats.
    - Enforces maximum file size limit in memory.
    - Verifies actual image header integrity using Pillow to prevent spoofing/corrupted uploads.
    """
    max_mb = max_size_mb or settings.SUPABASE_STORAGE_MAX_FILE_SIZE_MB
    content_type = (file.content_type or "").lower().strip()

    if content_type not in VALID_MIME_TYPES and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no admitido ('{content_type}'). Formatos válidos: JPG, PNG, WebP, BMP, TIFF."
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo proporcionado está vacío (0 bytes)."
        )

    # Size check
    max_bytes = max_mb * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el tamaño máximo permitido de {max_mb} MB."
        )

    # Integrity verification with Pillow
    try:
        with Image.open(io.BytesIO(raw_bytes)) as test_img:
            test_img.verify()
    except Exception as e:
        logger.error(f"Image verification failed for uploaded file '{file.filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El archivo no es una imagen válida o está dañado."
        )

    return raw_bytes


def process_image_to_variants(
    raw_bytes: bytes,
    context: str = "products"
) -> Dict[str, bytes]:
    """
    Procesamiento multimedia en memoria para Supabase Storage:
    - Normalización EXIF automática: ImageOps.exif_transpose()
    - Composición sobre fondo blanco plano (#FFFFFF) para canales alfa (RGBA/P) con Image.alpha_composite()
    - Recorte y centrado proporcional 1:1 con ImageOps.fit() y LANCZOS (sin deformar el producto)
    - Compresión dual WebP (Medium 500x500 Q=80, Thumb 150x150 Q=75) con optimize=True
    """
    cfg = VARIANT_CONFIGS.get(context, VARIANT_CONFIGS["default"])
    processed_variants: Dict[str, bytes] = {}

    try:
        with Image.open(io.BytesIO(raw_bytes)) as base_img:
            # 1. Corrección de orientación EXIF (giroscopio móvil/cámara)
            corrected_img = ImageOps.exif_transpose(base_img)

            # 2. Composición sobre fondo blanco para transparencias PNG/Palette (RGBA / P)
            if corrected_img.mode in ("RGBA", "LA") or (corrected_img.mode == "P" and "transparency" in corrected_img.info) or corrected_img.mode == "P":
                corrected_img = corrected_img.convert("RGBA")
                background = Image.new("RGBA", corrected_img.size, (255, 255, 255, 255))
                normalized_img = Image.alpha_composite(background, corrected_img).convert("RGB")
            else:
                normalized_img = corrected_img.convert("RGB")

            # 3. Escalado proporcional 1:1 Centered Fit con ImageOps.fit y compresión WebP
            for variant_name, spec in cfg.items():
                max_w, max_h = spec["size"]
                quality = spec["quality"]

                # ImageOps.fit centra y recorta manteniendo relación de aspecto 1:1 sin deformar
                var_img = ImageOps.fit(normalized_img, (max_w, max_h), method=Image.Resampling.LANCZOS)

                out_buf = io.BytesIO()
                var_img.save(
                    out_buf,
                    format="WEBP",
                    quality=quality,
                    method=6,
                    optimize=True
                )
                processed_variants[variant_name] = out_buf.getvalue()

    except Exception as e:
        logger.error(f"Error processing image variants for context '{context}': {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error al transformar la imagen a WebP: {str(e)}"
        )

    return processed_variants


async def process_and_upload_image(
    file: UploadFile,
    tenant_id: str = "default",
    category: str = "products",
    is_public: bool = True,
    file_id: Optional[str] = None,
    old_file_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Universal processing and upload pipeline for Supabase Storage:
    - Receives UploadFile, validates in memory.
    - Converts into WebP variants (medium, thumb).
    - Uploads directly to Supabase Storage under: {category}/{tenant_id}/{variant}_{file_id}.webp
    - Automatically purges old image variants from Supabase Storage if old_file_key is provided.
    - Returns full public CDN URLs and metadata.
    """
    raw_bytes = await validate_and_read_image(file)
    clean_tenant = tenant_id.strip() or "default"
    clean_cat = category.strip() or "products"
    target_id = file_id or uuid.uuid4().hex[:12]

    # Generate WebP variants in memory
    variants = process_image_to_variants(raw_bytes, context=clean_cat)
    urls: Dict[str, str] = {}
    paths: Dict[str, str] = {}

    for var_name, var_bytes in variants.items():
        storage_path = f"{clean_cat}/{clean_tenant}/{var_name}_{target_id}.webp"
        public_url = storage_service.upload_file(
            file_bytes=var_bytes,
            path=storage_path,
            content_type="image/webp",
            cache_control="public, max-age=31536000"
        )
        urls[var_name] = public_url
        paths[var_name] = storage_path

    # Clean up previous variants if an old key/URL was supplied
    if old_file_key:
        delete_image_variants(old_file_key)

    primary_url = urls.get("medium") or next(iter(urls.values()), "")
    thumb_url = urls.get("thumb") or primary_url

    return {
        "file_id": target_id,
        "image_id": target_id,
        "url": primary_url,
        "image_url": primary_url,
        "thumb_url": thumb_url,
        "variants": urls,
        "paths": paths,
        "category": clean_cat,
        "tenant_id": clean_tenant,
        "format": "webp"
    }


def delete_image_variants(image_key_or_url: Optional[str]) -> None:
    """
    Deletes both medium and thumb variants for a given image identifier or URL from Supabase Storage.
    Supports:
    - Full Supabase Storage URLs (e.g., https://.../payment_methods/default/medium_abc.webp)
    - Relative paths (e.g., payment_methods/default/medium_abc.webp)
    - Legacy hash IDs (e.g., abc123def456)
    - Legacy local paths (e.g., /static/payment_methods/medium_abc.webp)
    """
    if not image_key_or_url:
        return

    raw = image_key_or_url.strip()
    storage_path = storage_service.extract_storage_path(raw)

    paths_to_delete: List[str] = []

    # If it has medium_ or thumb_ in name, construct the matching counterpart
    if "medium_" in storage_path:
        paths_to_delete.append(storage_path)
        paths_to_delete.append(storage_path.replace("medium_", "thumb_"))
    elif "thumb_" in storage_path:
        paths_to_delete.append(storage_path)
        paths_to_delete.append(storage_path.replace("thumb_", "medium_"))
    elif "receipt_" in storage_path:
        paths_to_delete.append(storage_path)
        paths_to_delete.append(storage_path.replace("receipt_", "thumb_"))
    else:
        # Legacy ID without prefix or custom path
        paths_to_delete.append(storage_path)
        # Also check common folders if only a bare ID was passed
        if "/" not in storage_path and not storage_path.startswith("http"):
            paths_to_delete.append(f"payment_methods/system/medium_{storage_path}.webp")
            paths_to_delete.append(f"payment_methods/system/thumb_{storage_path}.webp")
            paths_to_delete.append(f"products/default/medium_{storage_path}.webp")
            paths_to_delete.append(f"products/default/thumb_{storage_path}.webp")

    # Clean up from Supabase Storage
    storage_service.delete_files(paths_to_delete)

    # Clean up legacy local files if applicable
    if raw.startswith("/static/") or raw.startswith("/uploads/") or "/" not in raw:
        clean_id = raw.split("/")[-1].replace(".webp", "").replace("medium_", "").replace("thumb_", "")
        storage_service._try_delete_local_file(f"payment_methods/medium_{clean_id}.webp")
        storage_service._try_delete_local_file(f"payment_methods/thumb_{clean_id}.webp")


# --------------------------------------------------------------------------
# Specialized Domain Helpers (Payment Methods, Products, Receipts, Logos)
# --------------------------------------------------------------------------

def extract_image_id(path_or_url: Optional[str]) -> Optional[str]:
    """
    Extrae el token único de 12 caracteres hex desde cualquier URL de Supabase,
    ruta relativa o ID directo.
    Ejemplo:
      https://.../medium_a1b2c3d4e5f6.webp -> a1b2c3d4e5f6
      products/biz-101/thumb_a1b2c3d4e5f6.webp -> a1b2c3d4e5f6
      a1b2c3d4e5f6 -> a1b2c3d4e5f6
    """
    if not path_or_url:
        return None
    clean = path_or_url.strip()
    match = re.search(r'(?:thumb_|medium_|receipt_)?([a-f0-9]{12})(?:\.webp)?', clean)
    if match:
        return match.group(1)
    parts = clean.split('/')[-1].split('.')[0]
    for prefix in ["thumb_", "medium_", "receipt_"]:
        if parts.startswith(prefix):
            parts = parts[len(prefix):]
    return parts or clean


def resolve_variant_url(url_or_id: Optional[str], variant: str = "medium") -> Optional[str]:
    """
    Intercambia de forma atómica la variante (medium <-> thumb) sobre URLs de Supabase Storage.
    """
    if not url_or_id:
        return None
    url = url_or_id.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return url
    if variant == "thumb" and "/medium_" in url:
        return url.replace("/medium_", "/thumb_")
    if variant == "medium" and "/thumb_" in url:
        return url.replace("/thumb_", "/medium_")
    return url


async def save_and_process_payment_method_image(
    file: UploadFile,
    old_image_id: Optional[str] = None,
    tenant_id: str = "system"
) -> Dict[str, Any]:
    """Processes payment method logos to WebP and stores them in Supabase Storage."""
    res = await process_and_upload_image(
        file=file,
        tenant_id=tenant_id,
        category="payment_methods",
        is_public=True,
        old_file_key=old_image_id
    )
    return {
        "image_id": res["file_id"],
        "file_id": res["file_id"],
        "url": res["url"],
        "image_url": res["url"],
        "thumb_url": res["thumb_url"],
        "medium_url": res["url"],
        "variants": res["variants"]
    }


def delete_payment_method_images(image_key_or_url: Optional[str]) -> None:
    """Deletes payment method logo variants from Supabase Storage and legacy local directories."""
    delete_image_variants(image_key_or_url)


async def save_and_process_product_image(
    file: UploadFile,
    old_image_url: Optional[str] = None,
    tenant_id: str = "default"
) -> Dict[str, Any]:
    """Processes product photos to WebP (500x500 medium, 150x150 thumb) and stores them in Supabase Storage."""
    res = await process_and_upload_image(
        file=file,
        tenant_id=tenant_id,
        category="products",
        is_public=True,
        old_file_key=old_image_url
    )
    return {
        "image_id": res["file_id"],
        "file_id": res["file_id"],
        "image_url": res["url"],
        "thumb_url": res["thumb_url"],
        "medium_url": res["url"],
        "variants": res["variants"]
    }


def delete_product_images(image_key_or_url: Optional[str]) -> None:
    """Deletes product image variants from Supabase Storage."""
    delete_image_variants(image_key_or_url)


async def save_and_process_receipt_image(
    file: UploadFile,
    old_image_url: Optional[str] = None,
    tenant_id: str = "default"
) -> Dict[str, Any]:
    """Processes payment receipt captures to WebP and stores them in Supabase Storage."""
    res = await process_and_upload_image(
        file=file,
        tenant_id=tenant_id,
        category="receipts",
        is_public=True,
        old_file_key=old_image_url
    )
    return {
        "image_id": res["file_id"],
        "file_id": res["file_id"],
        "receipt_url": res["url"],
        "image_url": res["url"],
        "thumb_url": res["thumb_url"],
        "medium_url": res["url"],
        "variants": res["variants"]
    }
