import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "1440"))
JWT_REFRESH_EXP_MINUTES = int(os.getenv("JWT_REFRESH_EXP_MINUTES", "10080"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(user_id: str, email: str, role: str, token_type: str = "access") -> str:
    minutes = JWT_EXP_MINUTES if token_type == "access" else JWT_REFRESH_EXP_MINUTES
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": user_id, "email": email, "role": role, "type": token_type, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
