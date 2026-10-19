from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
import httpx
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

async def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifica criptográficamente el token ID / Credential provisto por Google Identity Services.
    Consulta el endpoint oficial de Google OAuth2: https://oauth2.googleapis.com/tokeninfo
    """
    # Soporte para tokens mock en modo desarrollo
    if settings.ENVIRONMENT == "development" and id_token.startswith("mock-google-token"):
        parts = id_token.split(":")
        role = parts[1] if len(parts) > 1 else "OWNER"
        email = f"google.{role.lower()}@xion.com"
        return {
            "sub": f"google-uid-mock-{role.lower()}",
            "email": email,
            "email_verified": True,
            "name": f"Usuario Google ({role})",
            "picture": "https://lh3.googleusercontent.com/a/default-user"
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token}
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de Google inválido o expirado"
            )

        token_info = resp.json()

        # Validar issuer
        issuer = token_info.get("iss")
        if issuer not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Emisor (iss) del token de Google no reconocido"
            )

        # Validar audience si está configurado GOOGLE_CLIENT_ID
        if settings.GOOGLE_CLIENT_ID:
            aud = token_info.get("aud")
            if aud != settings.GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="El client_id (aud) del token de Google no coincide con el configurado"
                )

        # Validar que el correo esté verificado por Google
        email_verified = token_info.get("email_verified")
        if email_verified not in (True, "true"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cuenta de Google debe tener un correo electrónico verificado"
            )

        return {
            "sub": token_info.get("sub"),
            "email": token_info.get("email"),
            "email_verified": True,
            "name": token_info.get("name") or token_info.get("email", "").split("@")[0],
            "picture": token_info.get("picture")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar credenciales con Google OAuth: {str(e)}"
        )
