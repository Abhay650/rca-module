from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Investigation(Base):
    """One saved RCA investigation. Structured form fields live in columns;
    the AI-assisted analysis blocks are stored as JSON (works on PostgreSQL and MySQL)."""

    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    deviation_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    product_name: Mapped[str] = mapped_column(String(255), default="")
    batch_number: Mapped[str] = mapped_column(String(64), default="")
    severity: Mapped[str] = mapped_column(String(32), default="")
    status: Mapped[str] = mapped_column(String(32), default="Draft")  # Draft | Pending Review | Confirmed
    confirmed_by: Mapped[str] = mapped_column(String(128), default="")
    source_text: Mapped[str] = mapped_column(Text, default="")
    form: Mapped[dict] = mapped_column(JSON, default=dict)
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)  # whys, fishbone, root causes, missing evidence
    capas: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
