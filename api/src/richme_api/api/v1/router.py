from fastapi import APIRouter

from richme_api.api.v1 import admin_auth, admin_stocks, admin_themes, public_themes

api_router = APIRouter()
api_router.include_router(public_themes.router, prefix="/public")
admin_router = APIRouter(prefix="/admin", tags=["admin"])
admin_router.include_router(admin_auth.router, prefix="/auth")
admin_router.include_router(admin_stocks.router)
admin_router.include_router(admin_themes.router)
api_router.include_router(admin_router)
