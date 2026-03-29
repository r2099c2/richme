from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from richme_api.api.deps import get_current_admin
from richme_api.db.session import get_db
from richme_api.models.stock import Stock
from richme_api.models.theme import Theme, ThemeStockRole
from richme_api.schemas.theme import RoleCreate, ThemeCreate, ThemePatch, ThemeRowOut

router = APIRouter(prefix="/themes", dependencies=[Depends(get_current_admin)])


@router.post("", response_model=ThemeRowOut, status_code=status.HTTP_201_CREATED)
def create_theme(
    body: ThemeCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Theme:
    if body.parent_id is not None and db.get(Theme, body.parent_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent theme not found")
    theme = Theme(
        parent_id=body.parent_id,
        slug=body.slug,
        name=body.name,
        narrative=body.narrative,
        started_at=body.started_at,
        ended_at=body.ended_at,
    )
    db.add(theme)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Theme constraint violation"
        )
    db.refresh(theme)
    return theme


@router.patch("/{theme_id}", response_model=ThemeRowOut)
def patch_theme(
    theme_id: int,
    body: ThemePatch,
    db: Annotated[Session, Depends(get_db)],
) -> Theme:
    theme = db.get(Theme, theme_id)
    if theme is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(theme, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Theme constraint violation"
        )
    db.refresh(theme)
    return theme


@router.post("/{theme_id}/roles", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_theme_role(
    theme_id: int,
    body: RoleCreate,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int]:
    if db.get(Theme, theme_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    if db.get(Stock, body.stock_code) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stock not found: {body.stock_code}",
        )

    if body.close_previous_open_segment:
        open_rows = db.scalars(
            select(ThemeStockRole).where(
                ThemeStockRole.theme_id == theme_id,
                ThemeStockRole.stock_code == body.stock_code,
                ThemeStockRole.role_name == body.role_name,
                ThemeStockRole.valid_to.is_(None),
            )
        ).all()
        for row in open_rows:
            row.valid_to = body.valid_from

    row = ThemeStockRole(
        theme_id=theme_id,
        stock_code=body.stock_code,
        role_name=body.role_name,
        rank=body.rank,
        valid_from=body.valid_from,
        valid_to=body.valid_to,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate role segment (theme, stock, role_name, valid_from)",
        )
    db.refresh(row)
    return {"id": row.id}
