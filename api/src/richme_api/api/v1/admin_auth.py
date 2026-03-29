from fastapi import APIRouter, HTTPException, status

from richme_api.config import get_settings
from richme_api.schemas.auth import LoginRequest, TokenResponse
from richme_api.security import create_access_token, verify_admin_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def admin_login(body: LoginRequest) -> TokenResponse:
    settings = get_settings()
    if settings.admin_password_hash is None and settings.admin_password is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin login disabled: set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH",
        )
    if not verify_admin_password(body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    token = create_access_token()
    return TokenResponse(access_token=token)
