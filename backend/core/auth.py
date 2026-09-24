"""PostgreSQL-backed authentication for CYBERGUARD."""

from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Optional

import jwt

from database import get_connection


ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 12 * 3600

_env_secret = os.getenv("CYBERGUARD_SECRET_KEY")
SECRET_KEY = _env_secret or os.urandom(32).hex()

if not _env_secret:
    print(
        "[auth] CYBERGUARD_SECRET_KEY is not set — using a random key for this "
        "process. Every restart invalidates existing sessions."
    )


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        200_000,
    ).hex()


def create_user(
    username: str,
    password: str,
    name: str,
    email: Optional[str] = None,
    role: str = "analyst",
) -> dict:

    salt = os.urandom(16).hex()
    password_hash = _hash(password, salt)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users
                    (username, email, name, role, password_hash, password_salt)
                VALUES
                    (%s, %s, %s, %s, %s, %s)
                RETURNING id, username, email, name, role
                """,
                (
                    username,
                    email,
                    name,
                    role,
                    password_hash,
                    salt,
                ),
            )

            row = cur.fetchone()

    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "name": row[3],
        "role": row[4],
    }


def authenticate(username: str, password: str) -> Optional[dict]:

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    username,
                    email,
                    name,
                    role,
                    password_hash,
                    password_salt
                FROM users
                WHERE username = %s
                """,
                (username,),
            )

            row = cur.fetchone()

    if not row:
        return None

    user_id, db_username, email, name, role, stored_hash, salt = row

    supplied_hash = _hash(password, salt)

    if not hmac.compare_digest(supplied_hash, stored_hash):
        return None

    return {
        "id": user_id,
        "username": db_username,
        "email": email,
        "name": name,
        "role": role,
    }


def create_token(user: dict) -> str:

    now = int(time.time())

    payload = {
        **user,
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except jwt.PyJWTError:
        return None

    return {
        "id": payload.get("id"),
        "username": payload.get("username"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role"),
    }