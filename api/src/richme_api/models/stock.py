from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from richme_api.db.base import Base

if TYPE_CHECKING:
    from richme_api.models.concept import StockConcept
    from richme_api.models.theme import ThemeStockRole


class Stock(Base):
    __tablename__ = "stocks"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    region_secondary: Mapped[str | None] = mapped_column(String(64), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(128), nullable=True)
    industry_secondary: Mapped[str | None] = mapped_column(String(128), nullable=True)
    industry_segment: Mapped[str | None] = mapped_column(String(128), nullable=True)

    concept_links: Mapped[list[StockConcept]] = relationship(
        "StockConcept", back_populates="stock", cascade="all, delete-orphan"
    )
    theme_roles: Mapped[list[ThemeStockRole]] = relationship(
        "ThemeStockRole", back_populates="stock", cascade="all, delete-orphan"
    )
