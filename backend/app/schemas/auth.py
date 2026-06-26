from __future__ import annotations

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfessorCreate(BaseModel):
    name: str
    email: str
    password: str


class ProfessorLogin(BaseModel):
    email: str
    password: str


class ProfessorOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

