from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserCreateAdmin(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str
    role: str

class UserUpdateAdmin(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None # Admin can reset password natively

