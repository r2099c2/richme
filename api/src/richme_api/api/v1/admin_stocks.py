from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from richme_api.api.deps import get_current_admin
from richme_api.db.session import get_db
from richme_api.models.concept import Concept, StockConcept
from richme_api.models.stock import Stock
from richme_api.schemas.stock import StockBulkRequest, StockOut, StockPatch

router = APIRouter(prefix="/stocks", dependencies=[Depends(get_current_admin)])


def _upsert_concept(db: Session, code: str, name: str) -> Concept:
    c = db.scalar(select(Concept).where(Concept.code == code))
    if c:
        c.name = name
        return c
    c = Concept(code=code, name=name)
    db.add(c)
    db.flush()
    return c


@router.post("/bulk", status_code=status.HTTP_200_OK)
def stocks_bulk(
    body: StockBulkRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int]:
    """Upsert stocks; concepts from `concepts` + `concept_codes`; **replace** stock_concepts per stock."""
    for item in body.stocks:
        for ref in item.concepts:
            _upsert_concept(db, ref.code, ref.name)
        for code_only in item.concept_codes:
            _upsert_concept(db, code_only, code_only)

    for item in body.stocks:
        stock = db.get(Stock, item.code)
        if stock:
            stock.name = item.name
            stock.region = item.region
            stock.region_secondary = item.region_secondary
            stock.industry = item.industry
            stock.industry_secondary = item.industry_secondary
            stock.industry_segment = item.industry_segment
        else:
            stock = Stock(
                code=item.code,
                name=item.name,
                region=item.region,
                region_secondary=item.region_secondary,
                industry=item.industry,
                industry_secondary=item.industry_secondary,
                industry_segment=item.industry_segment,
            )
            db.add(stock)
        db.flush()

        db.execute(delete(StockConcept).where(StockConcept.stock_code == item.code))
        codes: set[str] = set(item.concept_codes)
        for ref in item.concepts:
            codes.add(ref.code)
        for code in sorted(codes):
            concept = db.scalar(select(Concept).where(Concept.code == code))
            if concept is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Concept code not found after upsert: {code}",
                )
            db.add(StockConcept(stock_code=item.code, concept_id=concept.id))

    db.commit()
    return {"updated": len(body.stocks)}


@router.patch("/{code}", response_model=StockOut)
def stocks_patch(
    code: str,
    body: StockPatch,
    db: Annotated[Session, Depends(get_db)],
) -> Stock:
    stock = db.get(Stock, code)
    if stock is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(stock, k, v)
    db.commit()
    db.refresh(stock)
    return stock
