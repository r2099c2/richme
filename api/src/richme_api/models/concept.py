from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from richme_api.db.base import Base

if TYPE_CHECKING:
    from richme_api.models.stock import Stock


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    stock_links: Mapped[list[StockConcept]] = relationship(
        "StockConcept", back_populates="concept", cascade="all, delete-orphan"
    )


class StockConcept(Base):
    __tablename__ = "stock_concepts"

    stock_code: Mapped[str] = mapped_column(
        String(16), ForeignKey("stocks.code", ondelete="CASCADE"), primary_key=True
    )
    concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True
    )

    stock: Mapped[Stock] = relationship("Stock", back_populates="concept_links")
    concept: Mapped[Concept] = relationship("Concept", back_populates="stock_links")
