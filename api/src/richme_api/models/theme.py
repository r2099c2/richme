from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from richme_api.db.base import Base

if TYPE_CHECKING:
    from richme_api.models.stock import Stock


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("themes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    slug: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    stock_roles: Mapped[list[ThemeStockRole]] = relationship(
        "ThemeStockRole", back_populates="theme", cascade="all, delete-orphan"
    )


class ThemeStockRole(Base):
    __tablename__ = "theme_stock_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    theme_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("themes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stock_code: Mapped[str] = mapped_column(
        String(16), ForeignKey("stocks.code", ondelete="CASCADE"), nullable=False, index=True
    )
    role_name: Mapped[str] = mapped_column(String(64), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    theme: Mapped[Theme] = relationship("Theme", back_populates="stock_roles")
    stock: Mapped[Stock] = relationship("Stock", back_populates="theme_roles")

    __table_args__ = (
        UniqueConstraint(
            "theme_id",
            "stock_code",
            "role_name",
            "valid_from",
            name="uq_theme_stock_role_valid_from",
        ),
    )
