from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ThemeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    parent_id: int | None = None
    slug: str = Field(max_length=64)
    name: str = Field(max_length=128)
    narrative: str | None = None
    started_at: datetime
    ended_at: datetime | None = None


class ThemePatch(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    slug: str | None = Field(default=None, max_length=64)
    name: str | None = Field(default=None, max_length=128)
    narrative: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class RoleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    stock_code: str = Field(max_length=16)
    role_name: str = Field(max_length=64)
    rank: int
    valid_from: datetime
    valid_to: datetime | None = None
    close_previous_open_segment: bool = Field(
        default=True,
        description="Close prior open interval (same theme, stock, role_name) at valid_from",
    )


class ThemeRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    slug: str
    name: str
    narrative: str | None
    started_at: datetime
    ended_at: datetime | None


class ConceptBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str


class StockInThemeOut(BaseModel):
    code: str
    name: str
    role_name: str
    rank: int
    concepts: list[ConceptBrief] = Field(default_factory=list)


class ThemeTreeOut(BaseModel):
    id: int
    parent_id: int | None
    slug: str
    name: str
    narrative: str | None
    started_at: datetime
    ended_at: datetime | None
    children: list[ThemeTreeOut] = Field(default_factory=list)
    stocks: list[StockInThemeOut] = Field(default_factory=list)


class PublicThemesByDateResponse(BaseModel):
    date: str
    timezone: str = "Asia/Shanghai"
    themes: list[ThemeTreeOut]
