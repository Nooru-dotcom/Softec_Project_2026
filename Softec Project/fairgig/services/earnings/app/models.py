from uuid import uuid4
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform = Column(String, nullable=False)
    shift_date = Column(Date, nullable=False)
    hours = Column(Numeric, nullable=False)
    gross = Column(Numeric, nullable=False)
    deductions = Column(Numeric, nullable=False)
    net = Column(Numeric, nullable=False)
    city_zone = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=text("NOW()"))


class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=True)
    file_path = Column(String, nullable=False)
    verification_status = Column(String, nullable=False, default="pending")
    verifier_comment = Column(String, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=text("NOW()"))
