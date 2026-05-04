from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel

from core.database import get_session
from core.models import User
from core.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_admin: bool
    modules: str


class UserInfo(BaseModel):
    username: str
    is_admin: bool
    modules: str


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        username=user.username,
        is_admin=user.is_admin,
        modules=user.modules,
    )


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserInfo(
        username=current_user.username,
        is_admin=current_user.is_admin,
        modules=current_user.modules,
    )
