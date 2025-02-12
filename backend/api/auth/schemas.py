from pydantic import BaseModel, EmailStr, constr
from typing import Annotated

# Username: 3-20 characters, only letters, numbers, and underscores allowed
UsernameStr = Annotated[str, constr(min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")]

# Password: At least 6 characters, must contain at least one letter and one number
PasswordStr = Annotated[str, constr(min_length=6, pattern=r"^(?=.*[A-Za-z])(?=.*\d).+$")]

# User Registration Schema
class UserCreate(BaseModel):
    username: UsernameStr
    email: EmailStr
    password: PasswordStr

# User Response Schema (Excludes Password)
class UserResponse(BaseModel):
    id: int
    username: UsernameStr
    email: EmailStr
    is_admin: bool

    class Config:
        from_attributes = True  # ORM model compatibility

# Login Request Schema (Now Uses Pydantic for Validation Instead of OAuth2PasswordRequestForm)
class LoginRequest(BaseModel):
    username: UsernameStr
    password: PasswordStr

# Token Response Schema (Explicitly Define `access_token` Type)
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool
