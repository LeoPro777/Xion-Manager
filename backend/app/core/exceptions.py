from fastapi import Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = 400,
        action_required: str | None = None,
        details: dict | None = None
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.action_required = action_required
        self.details = details or {}

async def app_exception_handler(request: Request, exc: AppException):
    payload = {
        "error_code": exc.error_code,
        "message": exc.message,
        "details": exc.details
    }
    if exc.action_required:
        payload["action_required"] = exc.action_required
        
    return JSONResponse(
        status_code=exc.status_code,
        content=payload
    )
