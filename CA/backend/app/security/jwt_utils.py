import os
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "SUPER_SECRET_CHANGE_THIS")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
