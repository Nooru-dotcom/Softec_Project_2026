from uuid import uuid4
import os
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import User
from .schemas import LoginRequest, MagicLinkRequest, RefreshRequest, SignupRequest, TokenResponse, UserResponse
from .security import JWT_ALGORITHM, JWT_SECRET, create_token, hash_password, verify_password

app = FastAPI(title="FairGig Auth Service", version="1.0.0")
security = HTTPBearer()

frontend_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in frontend_origins.split(",") if origin.strip()]
verifier_invite_code = os.getenv("VERIFIER_INVITE_CODE", "FAST").strip().upper()
advocate_invite_code = os.getenv("ADVOCATE_INVITE_CODE", "SOFTEC").strip().upper()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_email(email: str) -> str:
    return email.strip().lower()


@app.on_event("startup")
def startup() -> None:
    # Shared tables are seeded via root seed.sql.
    Base.metadata.create_all(bind=engine)


@app.post("/auth/signup", response_model=UserResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> UserResponse:
    if payload.role not in {"worker", "verifier", "advocate"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    invite_code = (payload.invite_code or "").strip().upper()
    if payload.role == "verifier" and invite_code != verifier_invite_code:
        raise HTTPException(status_code=403, detail="Visitor code required for verifier signup")
    if payload.role == "advocate" and invite_code != advocate_invite_code:
        raise HTTPException(status_code=403, detail="Advocate code required for advocate signup")

    normalized_email = normalize_email(str(payload.email))

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        id=str(uuid4()),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        city=payload.city,
        role=payload.role,
        is_role_approved=(payload.role == "worker" or payload.role in {"verifier", "advocate"}),
        is_identity_verified=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists") from exc

    db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        city=user.city,
        role=user.role,
        is_role_approved=user.is_role_approved,
        is_identity_verified=user.is_identity_verified,
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = normalize_email(str(payload.email))
    user = db.query(User).filter(User.email == normalized_email).first()
    password_ok = False
    if user:
        try:
            password_ok = verify_password(payload.password, user.password_hash)
        except Exception:
            # Seeded demo users may have placeholder hashes that are not passlib-verifiable.
            password_ok = False
        # Support seeded demo users from seed.sql where password_hash is a placeholder.
        if not password_ok and user.password_hash == "demo_hash" and payload.password == "Password123!":
            password_ok = True

    if not user or not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.role in {"verifier", "advocate"} and not user.is_role_approved:
        user.is_role_approved = True
        db.commit()
        db.refresh(user)

    access_token = create_token(str(user.id), user.email, user.role, token_type="access")
    refresh_token = create_token(str(user.id), user.email, user.role, token_type="refresh")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        token_payload = jwt.decode(payload.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Token is not a refresh token")

    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_token(str(user.id), user.email, user.role, token_type="access")
    refresh_token = create_token(str(user.id), user.email, user.role, token_type="refresh")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@app.post("/auth/magic-link")
def magic_link(payload: MagicLinkRequest, db: Session = Depends(get_db)) -> dict:
    normalized_email = normalize_email(str(payload.email))
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Demo mode: return token directly to emulate emailed magic link.
    token = create_token(str(user.id), user.email, user.role)
    return {
        "message": "Demo magic link generated",
        "demo_login_url": f"https://fairgig.local/demo-login?token={token}",
    }


@app.get("/auth/me", response_model=UserResponse)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        city=user.city,
        role=user.role,
        is_role_approved=user.is_role_approved,
        is_identity_verified=user.is_identity_verified,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "auth"}
