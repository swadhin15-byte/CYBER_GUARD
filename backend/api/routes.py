"""HTTP surface for the dashboard and the three detection modules."""
from __future__ import annotations

import asyncio
import json
import random
from typing import Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
    Security,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from core import auth as auth_core
from core import threat_engine
from models.anomaly import detector as anomaly
from models.deepfake import detector as deepfake
from models.phishing import detector as phishing


router = APIRouter()


# --------------------------------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


# ========================= ADDITION: SIGNUP REQUEST =========================

class SignupRequest(BaseModel):
    username: str
    email: str
    name: str
    password: str


# ===========================================================================


# Swagger/OpenAPI Bearer authentication
bearer_scheme = HTTPBearer(auto_error=False)


def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> dict:
    """Require a valid JWT bearer token."""

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="missing bearer token",
        )

    user = auth_core.decode_token(credentials.credentials)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="invalid or expired token",
        )

    return user


@router.post("/auth/login")
async def login(req: LoginRequest):
    user = auth_core.authenticate(
        req.username,
        req.password,
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="incorrect username or password",
        )

    return {
        "token": auth_core.create_token(user),
        "user": user,
    }


# ========================= ADDITION: SIGNUP API ============================

@router.post("/auth/signup")
async def signup(req: SignupRequest):
    username = req.username.strip()
    email = req.email.strip()
    name = req.name.strip()
    password = req.password

    if len(username) < 3:
        raise HTTPException(
            status_code=400,
            detail="Username must be at least 3 characters",
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required",
        )

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required",
        )

    try:
        user = auth_core.create_user(
            username=username,
            password=password,
            name=name,
            email=email,
        )

    except Exception as exc:
        message = str(exc).lower()

        if "duplicate key" in message or "unique constraint" in message:
            raise HTTPException(
                status_code=409,
                detail="Username or email already exists",
            )

        print(f"[SIGNUP ERROR] {exc}")

        raise HTTPException(
            status_code=500,
            detail="Could not create account",
        )

    return {
        "message": "Account created successfully",
        "user": user,
    }


# ===========================================================================


@router.get("/auth/me")
async def me(
    user: dict = Depends(require_user),
):
    return user


# --------------------------------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------------------------------

class PhishingRequest(BaseModel):
    channel: str = "email"
    sender: str = ""
    reply_to: str = ""
    subject: str = ""
    body: str = ""
    urls: List[str] = Field(default_factory=list)
    link_text: Dict[str, str] = Field(default_factory=dict)
    spf_pass: Optional[bool] = None
    sender_first_seen: bool = False
    domain_age_days: Optional[int] = None
    recipient: str = ""


class AnomalyRequest(BaseModel):
    user: str = ""
    asset: str = ""
    action: str = "login"
    ip: str = ""
    asn: str = ""
    geo: str = ""
    device_id: str = ""
    session_id: str = ""
    mfa_result: str = ""
    failed_accounts: int = 0
    volume: float = 0.0
    baseline_volume: float = 0.0
    ts: Optional[float] = None


class ActionRequest(BaseModel):
    action: str


class StatusRequest(BaseModel):
    status: str


# --------------------------------------------------------------------------
# LIVE PUSH
# --------------------------------------------------------------------------

_clients: List[WebSocket] = []


async def broadcast(
    incident: dict,
) -> None:

    dead = []

    for ws in _clients:

        try:

            await ws.send_text(
                json.dumps(
                    {
                        "type": "incident",
                        "incident": incident,
                    }
                )
            )

        except Exception:

            dead.append(ws)

    for ws in dead:

        if ws in _clients:
            _clients.remove(ws)


@router.websocket("/ws/events")
async def ws_events(
    websocket: WebSocket,
    token: str = "",
):

    if not auth_core.decode_token(token):

        await websocket.close(
            code=4401
        )

        return

    await websocket.accept()

    _clients.append(websocket)

    try:

        while True:

            await asyncio.sleep(30)

            await websocket.send_text(
                json.dumps(
                    {
                        "type": "ping"
                    }
                )
            )

    except WebSocketDisconnect:

        pass

    finally:

        if websocket in _clients:
            _clients.remove(websocket)


def _record(
    result: dict,
    target: str = "",
) -> dict:
    """Send a detector result through the unified pipeline."""

    return threat_engine.analyse(
        module=result["module"],
        subject=result["subject"],
        actor=result["actor"],
        indicators=result["indicators"],
        category=result["category"],
        explanation=result["explanation"],
        target=target or result.get("target", ""),
        source=result.get("source", ""),
    )


# --------------------------------------------------------------------------
# DETECTION ENDPOINTS
# --------------------------------------------------------------------------

@router.post("/analyze/phishing")
async def analyze_phishing(
    req: PhishingRequest,
    user: dict = Depends(require_user),
):

    result = phishing.detect(
        channel=req.channel,
        sender=req.sender,
        reply_to=req.reply_to,
        subject=req.subject,
        body=req.body,
        urls=req.urls,
        link_text=req.link_text,
        spf_pass=req.spf_pass,
        sender_first_seen=req.sender_first_seen,
        domain_age_days=req.domain_age_days,
    )

    incident = _record(
        result,
        target=req.recipient,
    )

    await broadcast(
        incident
    )

    return incident


@router.post("/analyze/deepfake")
async def analyze_deepfake(
    file: Optional[UploadFile] = File(None),
    uploader: str = Form(""),
    claimed_identity: str = Form(""),
    signals: str = Form("{}"),
    user: dict = Depends(require_user),
):

    """Accepts a media upload."""

    try:

        parsed = json.loads(
            signals or "{}"
        )

    except json.JSONDecodeError:

        raise HTTPException(
            status_code=400,
            detail="signals must be valid JSON",
        )

    filename = (
        file.filename
        if file
        else ""
    )

    result = deepfake.detect(
        filename=filename,
        uploader=uploader,
        claimed_identity=claimed_identity,
        signals=parsed,
    )

    incident = _record(
        result
    )

    await broadcast(
        incident
    )

    return incident


@router.post("/analyze/anomaly")
async def analyze_anomaly(
    req: AnomalyRequest,
    user: dict = Depends(require_user),
):

    result = anomaly.detect(
        **req.model_dump()
    )

    incident = _record(
        result
    )

    await broadcast(
        incident
    )

    return incident


# --------------------------------------------------------------------------
# DASHBOARD ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/events")
async def events(
    module: Optional[str] = None,
    min_score: int = 0,
    limit: int = 300,
    user: dict = Depends(require_user),
):

    return {
        "events": threat_engine.list_incidents(
            module=module,
            min_score=min_score,
            limit=limit,
        )
    }


@router.get("/events/{incident_id}")
async def event(
    incident_id: str,
    user: dict = Depends(require_user),
):

    inc = threat_engine.get_incident(
        incident_id
    )

    if inc is None:

        raise HTTPException(
            status_code=404,
            detail="incident not found",
        )

    return inc


@router.post("/events/{incident_id}/action")
async def act(
    incident_id: str,
    req: ActionRequest,
    user: dict = Depends(require_user),
):

    inc = threat_engine.apply_action(
        incident_id,
        req.action,
    )

    if inc is None:

        raise HTTPException(
            status_code=404,
            detail="incident not found",
        )

    return inc


@router.post("/events/{incident_id}/status")
async def status(
    incident_id: str,
    req: StatusRequest,
    user: dict = Depends(require_user),
):

    if req.status not in (
        "Open",
        "Monitoring",
        "Contained",
        "Escalated",
        "Closed",
    ):

        raise HTTPException(
            status_code=400,
            detail="unknown status",
        )

    inc = threat_engine.set_status(
        incident_id,
        req.status,
    )

    if inc is None:

        raise HTTPException(
            status_code=404,
            detail="incident not found",
        )

    return inc


@router.get("/stats")
async def stats(
    user: dict = Depends(require_user),
):

    return threat_engine.stats()


@router.get("/health")
async def health():

    return {
        "status": "ok",
        "modules": list(
            threat_engine.MODULES
        ),
    }


# --------------------------------------------------------------------------
# LIVE INGEST
# --------------------------------------------------------------------------

_live_ingest_task = None
_live_ingest_running = False


async def _live_ingest_loop():

    global _live_ingest_running

    while _live_ingest_running:

        try:

            # Randomly generate a realistic security event.
            scenario = random.choice(
                [
                    "phishing",
                    "anomaly",
                    "phishing",
                    "anomaly",
                ]
            )

            # --------------------------------------------------------------
            # PHISHING EVENT
            # --------------------------------------------------------------

            if scenario == "phishing":

                payload = {
                    "channel": "email",

                    "sender": (
                        "security-alert@"
                        "corp-identity-desk.com"
                    ),

                    "reply_to": "",

                    "subject": (
                        "Urgent account verification required"
                    ),

                    "body": (
                        "Your account requires immediate "
                        "verification. Reply with the "
                        "one-time security code sent to "
                        "your phone."
                    ),

                    "urls": [
                        "https://corp-identity-desk.com/verify"
                    ],

                    "link_text": {},

                    "spf_pass": False,

                    "sender_first_seen": True,

                    "domain_age_days": random.randint(
                        1,
                        15,
                    ),

                    "recipient": "employee",
                }

                result = phishing.detect(
                    channel=payload["channel"],
                    sender=payload["sender"],
                    reply_to=payload["reply_to"],
                    subject=payload["subject"],
                    body=payload["body"],
                    urls=payload["urls"],
                    link_text=payload["link_text"],
                    spf_pass=payload["spf_pass"],
                    sender_first_seen=payload["sender_first_seen"],
                    domain_age_days=payload["domain_age_days"],
                )

                incident = _record(
                    result,
                    target=payload["recipient"],
                )

                await broadcast(
                    incident
                )

            # --------------------------------------------------------------
            # ANOMALY / ACCOUNT TAKEOVER EVENT
            # --------------------------------------------------------------

            else:

                # First location establishes the user's normal session.
                normal_event = {
                    "user": "live.user",
                    "asset": "Corporate SSO",
                    "action": "login",
                    "ip": "10.10.10.20",
                    "asn": "AS55836",
                    "geo": "Bhubaneswar, IN",
                    "device_id": "live-device-a",
                    "session_id": "live-session",
                    "mfa_result": "success",
                    "failed_accounts": 0,
                    "volume": 1,
                    "baseline_volume": 1,
                }

                anomaly.detect(
                    **normal_event
                )

                # Suspicious login from another country/device.
                suspicious_event = {
                    "user": "live.user",
                    "asset": "Corporate SSO",
                    "action": "login",
                    "ip": "198.51.100.20",
                    "asn": "AS14061",
                    "geo": "Ashburn, US",
                    "device_id": "live-device-b",
                    "session_id": "live-session",
                    "mfa_result": "success",
                    "failed_accounts": 0,
                    "volume": 1,
                    "baseline_volume": 1,
                }

                result = anomaly.detect(
                    **suspicious_event
                )

                incident = _record(
                    result
                )

                await broadcast(
                    incident
                )

        except asyncio.CancelledError:

            # Normal when the user presses Stop.
            break

        except Exception as exc:

            print(
                f"[LIVE INGEST ERROR] {exc}"
            )

        # Generate approximately one event every 5 seconds.
        await asyncio.sleep(5)


# --------------------------------------------------------------------------
# START LIVE INGEST
# --------------------------------------------------------------------------

@router.post("/ingest/start")
async def start_ingest(
    user: dict = Depends(require_user),
):

    global _live_ingest_task
    global _live_ingest_running

    # Already running
    if _live_ingest_running:

        return {
            "running": True,
            "message": "Live ingest already running",
        }

    _live_ingest_running = True

    _live_ingest_task = asyncio.create_task(
        _live_ingest_loop()
    )

    return {
        "running": True,
        "message": "Live ingest started",
    }


# --------------------------------------------------------------------------
# STOP LIVE INGEST
# --------------------------------------------------------------------------

@router.post("/ingest/stop")
async def stop_ingest(
    user: dict = Depends(require_user),
):

    global _live_ingest_task
    global _live_ingest_running

    _live_ingest_running = False

    if _live_ingest_task:

        _live_ingest_task.cancel()

        _live_ingest_task = None

    return {
        "running": False,
        "message": "Live ingest stopped",
    }


# --------------------------------------------------------------------------
# LIVE INGEST STATUS
# --------------------------------------------------------------------------

@router.get("/ingest/status")
async def ingest_status(
    user: dict = Depends(require_user),
):

    return {
        "running": _live_ingest_running,
    }


# --------------------------------------------------------------------------
# RESET DEMO DATA
# --------------------------------------------------------------------------

@router.post("/reset")
async def reset_demo_data(
    user: dict = Depends(require_user),
):
    """Stop live ingest and delete all CyberGuard incidents."""

    global _live_ingest_task
    global _live_ingest_running

    # Stop live ingestion first.
    _live_ingest_running = False

    if _live_ingest_task:
        _live_ingest_task.cancel()
        _live_ingest_task = None

    # Delete stored incidents.
    threat_engine.reset()

    return {
        "success": True,
        "message": "All CyberGuard demo incidents have been deleted.",
        "running": False,
    }   