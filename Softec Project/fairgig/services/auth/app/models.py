from uuid import uuid4
from sqlalchemy import Boolean, Column, DateTime, String, text
from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_role_approved = Column(Boolean, nullable=False, default=False)
    is_identity_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=text("NOW()"))
