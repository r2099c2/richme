"""GET /public/themes/by-date/{date} — calendar day in Asia/Shanghai (03-api §3.5)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from richme_api.db.session import get_db
from richme_api.models.concept import Concept, StockConcept
from richme_api.models.stock import Stock
from richme_api.models.theme import Theme, ThemeStockRole
from richme_api.schemas.theme import (
    ConceptBrief,
    PublicThemesByDateResponse,
    StockInThemeOut,
    ThemeTreeOut,
)
from richme_api.time_utils import SHANGHAI_TZ, calendar_day_bounds

router = APIRouter(prefix="/themes", tags=["public"])


def _concepts_for_stock(db: Session, stock_code: str) -> list[ConceptBrief]:
    rows = db.scalars(
        select(Concept)
        .join(StockConcept, StockConcept.concept_id == Concept.id)
        .where(StockConcept.stock_code == stock_code)
        .order_by(Concept.code)
    ).all()
    return [ConceptBrief(code=c.code, name=c.name) for c in rows]


def _stocks_for_theme(
    db: Session,
    theme_id: int,
    day_start,
    day_end,
    include_concepts: bool,
) -> list[StockInThemeOut]:
    rows = db.scalars(
        select(ThemeStockRole).where(
            ThemeStockRole.theme_id == theme_id,
            ThemeStockRole.valid_from < day_end,
            or_(ThemeStockRole.valid_to.is_(None), ThemeStockRole.valid_to >= day_start),
        )
    ).all()
    best: dict[tuple[str, str], ThemeStockRole] = {}
    for r in rows:
        k = (r.stock_code, r.role_name)
        if k not in best or r.valid_from > best[k].valid_from:
            best[k] = r
    out: list[StockInThemeOut] = []
    for r in sorted(best.values(), key=lambda x: (-x.rank, x.stock_code)):
        stock = db.get(Stock, r.stock_code)
        name = stock.name if stock else r.stock_code
        concepts = _concepts_for_stock(db, r.stock_code) if include_concepts else []
        out.append(
            StockInThemeOut(
                code=r.stock_code,
                name=name,
                role_name=r.role_name,
                rank=r.rank,
                concepts=concepts,
            )
        )
    return out


def _build_tree(
    db: Session,
    theme: Theme,
    themes_by_parent: dict[int | None, list[Theme]],
    day_start,
    day_end,
    include_concepts: bool,
) -> ThemeTreeOut:
    children_orms = sorted(
        themes_by_parent.get(theme.id, []),
        key=lambda t: (t.started_at, t.id),
    )
    children = [
        _build_tree(db, ch, themes_by_parent, day_start, day_end, include_concepts)
        for ch in children_orms
    ]
    stocks = _stocks_for_theme(db, theme.id, day_start, day_end, include_concepts)
    return ThemeTreeOut(
        id=theme.id,
        parent_id=theme.parent_id,
        slug=theme.slug,
        name=theme.name,
        narrative=theme.narrative,
        started_at=theme.started_at,
        ended_at=theme.ended_at,
        children=children,
        stocks=stocks,
    )


@router.get("/by-date/{day}", response_model=PublicThemesByDateResponse)
def themes_by_date(
    day: date,
    db: Annotated[Session, Depends(get_db)],
    include_concepts: Annotated[
        bool,
        Query(description="Include stock concepts under each stock row"),
    ] = False,
) -> PublicThemesByDateResponse:
    day_start, day_end = calendar_day_bounds(day)
    overlap = (
        Theme.started_at < day_end,
        or_(Theme.ended_at.is_(None), Theme.ended_at >= day_start),
    )
    themes = db.scalars(select(Theme).where(*overlap).order_by(Theme.started_at, Theme.id)).all()
    by_id = {t.id: t for t in themes}
    themes_by_parent: dict[int | None, list[Theme]] = {}
    for t in themes:
        themes_by_parent.setdefault(t.parent_id, []).append(t)

    roots: list[Theme] = []
    for t in themes:
        if t.parent_id is None:
            roots.append(t)
        elif t.parent_id not in by_id:
            roots.append(t)

    seen_root: set[int] = set()
    unique_roots: list[Theme] = []
    for t in sorted(roots, key=lambda x: (x.started_at, x.id)):
        if t.id not in seen_root:
            seen_root.add(t.id)
            unique_roots.append(t)

    trees = [
        _build_tree(db, root, themes_by_parent, day_start, day_end, include_concepts)
        for root in unique_roots
    ]
    return PublicThemesByDateResponse(
        date=day.isoformat(),
        timezone=str(SHANGHAI_TZ),
        themes=trees,
    )
