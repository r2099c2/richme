from pydantic import BaseModel, ConfigDict, Field


class ConceptRef(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(max_length=64)
    name: str = Field(max_length=128)


class StockBulkItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    code: str = Field(max_length=16)
    name: str = Field(max_length=64)
    region: str | None = Field(default=None, max_length=64)
    region_secondary: str | None = Field(default=None, max_length=64)
    industry: str | None = Field(default=None, max_length=128)
    industry_secondary: str | None = Field(default=None, max_length=128)
    industry_segment: str | None = Field(default=None, max_length=128)
    concept_codes: list[str] = Field(
        default_factory=list,
        description="Extra concept codes; new rows get name=code unless listed in concepts",
    )
    concepts: list[ConceptRef] = Field(
        default_factory=list,
        description="Upsert concepts by code+name for this bulk row",
    )


class StockBulkRequest(BaseModel):
    stocks: list[StockBulkItem]


class StockPatch(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=64)
    region_secondary: str | None = Field(default=None, max_length=64)
    industry: str | None = Field(default=None, max_length=128)
    industry_secondary: str | None = Field(default=None, max_length=128)
    industry_segment: str | None = Field(default=None, max_length=128)


class StockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    region: str | None
    region_secondary: str | None
    industry: str | None
    industry_secondary: str | None
    industry_segment: str | None
