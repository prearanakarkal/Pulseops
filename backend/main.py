"""
PulseOps - Autonomous On-Call Incident Investigation Agent
FastAPI Application, SSE Streaming, Chaos Ingestion, HITL Approval Gateway
"""

import os
import json
import time
import random
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sse_starlette.sse import EventSourceResponse

from backend.database import db_manager
from backend.seed_data import seed_database, inject_scenario_data, reset_to_healthy
from backend.models import (
    AlertIn,
    ChaosTriggerRequest,
    IncidentTicket,
    ApprovalRequest,
    TelemetryPoint
)
from backend.agent import (
    AutonomousReActAgent,
    get_or_create_stream_queue,
    get_incident_steps,
    _incident_steps_history
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("pulseops.api")

# --- Telemetry Engine Simulator State ---
class TelemetryState:
    def __init__(self):
        self.active_scenario: Optional[str] = None
        self.is_critical: bool = False
        self.active_incident_id: Optional[str] = None
        self.incident_start_time: Optional[float] = None
        self.last_alert_time: float = 0
        self.cpu = 24.5
        self.ram = 41.2
        self.latency = 38.0
        self.error_rate = 0.02
        self.connections = 42

    def set_fault(self, scenario_id: str, incident_id: str):
        self.active_scenario = scenario_id
        self.is_critical = True
        self.active_incident_id = incident_id
        self.incident_start_time = time.time()
        self.last_alert_time = time.time()

    def set_healthy(self):
        self.active_scenario = None
        self.is_critical = False
        self.active_incident_id = None
        self.incident_start_time = None

    def tick(self) -> Dict[str, Any]:
        """Generates realistic live telemetry fluctuations based on state."""
        if not self.is_critical:
            # Healthy baseline jitter
            self.cpu = max(15.0, min(35.0, self.cpu + random.uniform(-1.5, 1.5)))
            self.ram = max(38.0, min(48.0, self.ram + random.uniform(-0.8, 0.8)))
            self.latency = max(25.0, min(55.0, self.latency + random.uniform(-3.0, 3.0)))
            self.error_rate = max(0.00, min(0.08, self.error_rate + random.uniform(-0.01, 0.01)))
            self.connections = max(30, min(65, int(self.connections + random.randint(-2, 2))))
            status = "HEALTHY"
        else:
            # Fault states based on scenario
            if self.active_scenario == "scenario_1":
                # Mongo Connection Pool Exhaustion (500)
                self.cpu = max(55.0, min(75.0, self.cpu + random.uniform(-2.0, 2.0)))
                self.ram = max(70.0, min(84.0, self.ram + random.uniform(-1.0, 1.0)))
                self.latency = max(1800.0, min(3400.0, self.latency + random.uniform(-150.0, 180.0)))
                self.error_rate = max(32.0, min(52.0, self.error_rate + random.uniform(-2.5, 3.0)))
                self.connections = 500
            elif self.active_scenario == "scenario_2":
                # Auth Memory Leak & CPU Spike (503)
                self.cpu = max(94.0, min(99.4, self.cpu + random.uniform(-0.5, 0.8)))
                self.ram = max(92.0, min(97.5, self.ram + random.uniform(-0.3, 0.5)))
                self.latency = max(800.0, min(1600.0, self.latency + random.uniform(-50.0, 60.0)))
                self.error_rate = max(45.0, min(68.0, self.error_rate + random.uniform(-2.0, 2.0)))
                self.connections = max(120, min(180, int(self.connections + random.randint(-5, 5))))
            elif self.active_scenario == "scenario_3":
                # SSL Expired Gateway Timeout (504)
                self.cpu = max(30.0, min(48.0, self.cpu + random.uniform(-1.5, 1.5)))
                self.ram = max(45.0, min(55.0, self.ram + random.uniform(-1.0, 1.0)))
                self.latency = max(4500.0, min(15000.0, self.latency + random.uniform(-400.0, 500.0)))
                self.error_rate = max(50.0, min(85.0, self.error_rate + random.uniform(-3.0, 3.0)))
                self.connections = max(40, min(90, int(self.connections + random.randint(-2, 2))))
            else:
                self.cpu = 88.0
                self.latency = 2200.0
                self.error_rate = 40.0
            status = "CRITICAL"

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu_usage": round(self.cpu, 1),
            "ram_usage": round(self.ram, 1),
            "latency_ms": round(self.latency, 1),
            "error_rate_pct": round(self.error_rate, 2),
            "active_connections": self.connections,
            "status": status,
            "active_scenario": self.active_scenario,
            "active_incident_id": self.active_incident_id,
            "is_critical": self.is_critical
        }

telemetry_engine = TelemetryState()

# --- Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed baseline
    await db_manager.initialize()
    await seed_database(db_manager)
    logger.info("PulseOps backend initialized and verified.")
    yield
    logger.info("PulseOps backend shutting down.")

app = FastAPI(
    title="PulseOps API",
    description="Autonomous On-Call Incident Investigation Agent",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper: Trigger Agent Task ---
async def _execute_agent_investigation(incident_id: str, alert: AlertIn):
    try:
        agent = AutonomousReActAgent(incident_id=incident_id, alert=alert)
        await agent.run_investigation()
    except Exception as e:
        logger.exception("Error during agent investigation: %s", str(e))
        queue = get_or_create_stream_queue(incident_id)
        await queue.put({
            "incident_id": incident_id,
            "step_index": 999,
            "type": "conclusion",
            "content": f"Agent encountered error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })


# --- Module 1: Chaos Engineering & Alert Ingestion ---

@app.post("/api/chaos/trigger")
async def trigger_chaos(req: ChaosTriggerRequest, background_tasks: BackgroundTasks):
    """
    Frontend Developer Control Panel Chaos Trigger.
    Injects one of 3 realistic failure scenarios into DB & launches Agent.
    """
    logger.info("Triggering Chaos Scenario: %s", req.scenario_id)
    await inject_scenario_data(db_manager, req.scenario_id)

    incident_id = f"INC-2026-{int(time.time()) % 10000:04d}"
    telemetry_engine.set_fault(req.scenario_id, incident_id)

    scenario_alerts = {
        "scenario_1": AlertIn(
            service="payment-service",
            error_code="HTTP 500",
            message="Critical Connection Failure: pymongo connection pool exhausted (500/500). Checkout requests timing out after 30s.",
            severity="P0 - Critical",
            scenario_id="scenario_1"
        ),
        "scenario_2": AlertIn(
            service="auth-service",
            error_code="HTTP 503",
            message="Fatal: Memory Leak & CPU spike (98.4%) on auth-service worker pod. Container CrashLoopBackOff.",
            severity="P0 - Critical",
            scenario_id="scenario_2"
        ),
        "scenario_3": AlertIn(
            service="api-gateway",
            error_code="HTTP 504",
            message="Gateway Timeout: SSL certificate expired for upstream orders.internal.infra:443. Handshake terminating.",
            severity="P1 - High",
            scenario_id="scenario_3"
        )
    }

    alert = scenario_alerts.get(req.scenario_id, scenario_alerts["scenario_1"])

    # Immediately persist initial ticket so it is always present for query or manual override
    now_iso = datetime.now(timezone.utc).isoformat()
    init_ticket = IncidentTicket(
        ticket_id=incident_id,
        title=f"Active Outage: {alert.error_code} on {alert.service}",
        severity=alert.severity,
        confidence_score=45,
        root_cause_summary="Agent actively querying logs, traces, and metrics to isolate root cause...",
        cascading_failure_map=f"{alert.service} -> API Gateway -> Ingress Clients",
        proposed_fix="Awaiting autonomous agent diagnosis...",
        action_items=["Isolate failing hop", "Analyze stack traces", "Formulate remediation rollback"],
        status="INVESTIGATING",
        mttd_seconds=1.2,
        created_at=now_iso,
        audit_trail=[f"[{now_iso}] Incident created. AI agent dispatched."],
        scenario_id=req.scenario_id
    )
    col = db_manager.get_collection("incidents")
    ticket_doc = init_ticket.model_dump()
    ticket_doc["_id"] = incident_id
    await col.insert_one(ticket_doc)

    if req.auto_trigger_agent:
        background_tasks.add_task(_execute_agent_investigation, incident_id, alert)

    return {
        "status": "CHAOS_INJECTED",
        "scenario_id": req.scenario_id,
        "incident_id": incident_id,
        "ticket_id": incident_id,
        "alert": alert.model_dump()
    }


@app.post("/api/webhooks/alert")
async def ingest_alert(alert: AlertIn, background_tasks: BackgroundTasks):
    """
    Simulated Webhook Listener for external monitoring tools (Datadog, Prometheus, PagerDuty).
    Includes Event Deduplication: groups duplicate alerts within 3 minutes into active incident.
    """
    now = time.time()
    # Deduplication check
    if telemetry_engine.is_critical and (now - telemetry_engine.last_alert_time < 180):
        if telemetry_engine.active_incident_id:
            logger.info("Deduplicating incoming alert for active incident %s", telemetry_engine.active_incident_id)
            return {
                "status": "DEDUPLICATED",
                "message": "Grouped into active ongoing incident investigation.",
                "incident_id": telemetry_engine.active_incident_id
            }

    incident_id = f"INC-2026-{int(now) % 10000:04d}"
    scenario = alert.scenario_id or ("scenario_1" if "500" in alert.error_code else "scenario_2" if "503" in alert.error_code else "scenario_3")
    
    # Inject fault data to ensure DB has traces for this alert
    try:
        await inject_scenario_data(db_manager, scenario)
    except Exception:
        pass

    telemetry_engine.set_fault(scenario, incident_id)

    # Immediately persist initial ticket
    now_iso = datetime.now(timezone.utc).isoformat()
    init_ticket = IncidentTicket(
        ticket_id=incident_id,
        title=f"Alert Ingested: {alert.error_code} on {alert.service}",
        severity=alert.severity,
        confidence_score=40,
        root_cause_summary=f"Investigating alert: {alert.message}",
        cascading_failure_map=f"{alert.service} -> Downstream Dependencies",
        proposed_fix="Investigating...",
        action_items=["Ingest alert metadata", "Correlate telemetry", "Formulate fix"],
        status="INVESTIGATING",
        mttd_seconds=1.0,
        created_at=now_iso,
        audit_trail=[f"[{now_iso}] Alert received from {alert.service}. Investigation started."],
        scenario_id=scenario
    )
    col = db_manager.get_collection("incidents")
    ticket_doc = init_ticket.model_dump()
    ticket_doc["_id"] = incident_id
    await col.insert_one(ticket_doc)

    background_tasks.add_task(_execute_agent_investigation, incident_id, alert)

    return {
        "status": "ALERT_INGESTED",
        "incident_id": incident_id,
        "service": alert.service,
        "error_code": alert.error_code
    }


@app.get("/api/telemetry")
async def get_telemetry_snapshot():
    """Returns current live telemetry snapshot."""
    return telemetry_engine.tick()


@app.get("/api/stream/telemetry")
async def stream_telemetry(request: Request):
    """
    Server-Sent Events (SSE) pushing live simulated metrics
    (CPU, RAM, Latency ms, Error Rate %, Active Conns) to frontend charts.
    """
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            point = telemetry_engine.tick()
            yield {
                "data": json.dumps(point)
            }
            await asyncio.sleep(1.0)

    return EventSourceResponse(event_generator())


@app.get("/api/stream/agent/{incident_id}")
async def stream_agent_steps(incident_id: str, request: Request):
    """
    SSE stream yielding live Reason-Act (ReAct) steps:
    🧠 THOUGHT, 🛠️ TOOL CALL, 📊 OBSERVATION, ✅ CONCLUSION.
    """
    queue = get_or_create_stream_queue(incident_id)

    async def event_generator():
        # First send any existing past steps for this incident
        past_steps = get_incident_steps(incident_id)
        for s in past_steps:
            yield {
                "data": json.dumps(s)
            }

        # Then stream incoming new steps
        while True:
            if await request.is_disconnected():
                break
            try:
                # Wait up to 2 seconds for next step or send heartbeat
                step = await asyncio.wait_for(queue.get(), timeout=2.0)
                yield {
                    "data": json.dumps(step)
                }
                queue.task_done()
            except asyncio.TimeoutError:
                # Heartbeat
                yield {
                    "data": json.dumps({"step_type": "SYSTEM_PING", "timestamp": datetime.now(timezone.utc).isoformat()})
                }

    return EventSourceResponse(event_generator())


@app.get("/api/agent/{incident_id}/steps")
async def get_agent_steps_endpoint(incident_id: str):
    """Returns past steps for an incident."""
    steps = get_incident_steps(incident_id)
    return {"incident_id": incident_id, "steps": steps}


# --- Module 4 & 5: Incident Ticket Management & HITL Approval ---

@app.get("/api/incidents")
async def get_incidents():
    """Returns list of incident tickets sorted by timestamp desc."""
    col = db_manager.get_collection("incidents")
    cursor = await col.find({}, sort=[("created_at", -1)], limit=20)
    items = await cursor.to_list(20)
    return {"incidents": items}


@app.get("/api/incidents/{ticket_id}")
async def get_incident(ticket_id: str):
    """Returns details for a specific incident ticket."""
    col = db_manager.get_collection("incidents")
    doc = await col.find_one({"ticket_id": ticket_id})
    if not doc:
        doc = await col.find_one({"_id": ticket_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Incident ticket not found")
    return doc


@app.post("/api/incidents/{ticket_id}/approve")
async def approve_incident_remediation(ticket_id: str, req: Optional[ApprovalRequest] = None):
    """
    Human-in-the-Loop (HITL) Approval Gateway.
    Admin clicks "Approve & Execute Fix".
    Executes remediation, restores healthy telemetry, sets status to RESOLVED, logs audit.
    """
    col = db_manager.get_collection("incidents")
    ticket = await col.find_one({"ticket_id": ticket_id})
    if not ticket:
        ticket = await col.find_one({"_id": ticket_id})
    if not ticket:
        # Fallback: if user approved an incident currently being investigated
        cursor = await col.find({}, sort=[("created_at", -1)], limit=1)
        items = await cursor.to_list(1)
        if items:
            ticket = items[0]
            ticket_id = ticket.get("ticket_id", ticket_id)

    if not ticket:
        raise HTTPException(status_code=404, detail="Incident ticket not found")

    now = datetime.now(timezone.utc).isoformat()
    now_epoch = time.time()
    
    # Calculate MTTR
    created_at_str = ticket.get("created_at")
    mttr = 45.0
    if created_at_str:
        try:
            created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            mttr = round((datetime.now(timezone.utc) - created_dt).total_seconds(), 2)
        except Exception:
            pass

    audit_entry = f"[{now}] APPROVED by SRE Human Operator. Remediation executed: '{ticket.get('proposed_fix', 'Rollback applied')}'. Telemetry returned to nominal green."

    update_payload = {
        "status": "RESOLVED",
        "resolved_at": now,
        "mttr_seconds": mttr,
        "audit_trail": ticket.get("audit_trail", []) + [audit_entry]
    }

    await col.update_one({"ticket_id": ticket_id}, {"$set": update_payload})
    ticket.update(update_payload)

    # Restore healthy telemetry
    telemetry_engine.set_healthy()
    # Reset fault in mock DB so subsequent queries show healthy
    await seed_database(db_manager)

    # Broadcast remediation completion to agent stream
    queue = get_or_create_stream_queue(ticket_id)
    step_data = {
        "incident_id": ticket_id,
        "step_index": len(get_incident_steps(ticket_id)) + 1,
        "type": "remediation_complete",
        "content": f"REMEDIATION EXECUTED: Human approval confirmed. Rollback/fix deployed successfully. MTTR: {mttr}s. System status: RESOLVED (Green).",
        "timestamp": now
    }
    _incident_steps_history.setdefault(ticket_id, []).append(step_data)
    await queue.put(step_data)

    logger.info("Incident %s resolved with MTTR: %s seconds", ticket_id, mttr)
    return {
        "status": "RESOLVED",
        "ticket": ticket
    }


@app.post("/api/incidents/{ticket_id}/override")
async def override_incident(ticket_id: str, req: ApprovalRequest):
    """
    HITL Manual Override: Reject fix, edit RCA text, or modify severity.
    """
    col = db_manager.get_collection("incidents")
    ticket = await col.find_one({"ticket_id": ticket_id})
    if not ticket:
        ticket = await col.find_one({"_id": ticket_id})
    if not ticket:
        cursor = await col.find({}, sort=[("created_at", -1)], limit=1)
        items = await cursor.to_list(1)
        if items:
            ticket = items[0]
            ticket_id = ticket.get("ticket_id", ticket_id)

    if not ticket:
        raise HTTPException(status_code=404, detail="Incident ticket not found")

    now = datetime.now(timezone.utc).isoformat()
    new_status = "RESOLVED" if req.approved else "REJECTED"
    audit_entry = f"[{now}] MANUAL OVERRIDE applied by human operator. Status: {new_status}. Notes: {req.override_notes or 'None'}."

    update_payload = {
        "status": new_status,
        "resolved_at": now if new_status == "RESOLVED" else None,
        "audit_trail": ticket.get("audit_trail", []) + [audit_entry]
    }
    if req.new_severity:
        update_payload["severity"] = req.new_severity
    if req.override_notes:
        update_payload["root_cause_summary"] = f"{ticket.get('root_cause_summary')} [Operator Note: {req.override_notes}]"

    await col.update_one({"ticket_id": ticket_id}, {"$set": update_payload})
    ticket.update(update_payload)

    if new_status == "RESOLVED":
        telemetry_engine.set_healthy()

    return {"status": new_status, "ticket": ticket}


# --- Module 6: Post-Mortem & Integrations ---

@app.get("/api/incidents/{ticket_id}/post-mortem")
async def export_post_mortem(ticket_id: str):
    """
    Generates a structured, production-grade Post-Mortem Incident Report in Markdown.
    """
    col = db_manager.get_collection("incidents")
    ticket = await col.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Incident ticket not found")

    steps = get_incident_steps(ticket_id)
    steps_md = "\n".join([
        f"- **[{s.get('type', '').upper()}]** (`{s.get('timestamp')}`): {s.get('content')}"
        for s in steps
    ])

    action_items_md = "\n".join([f"- [ ] {item}" for item in ticket.get("action_items", [])])
    audit_trail_md = "\n".join([f"- {a}" for a in ticket.get("audit_trail", [])])

    post_mortem_md = f"""# Post-Mortem Incident Report: {ticket.get('ticket_id')}
**Title:** {ticket.get('title')}  
**Severity:** {ticket.get('severity')}  
**Status:** {ticket.get('status')}  
**Confidence Score:** {ticket.get('confidence_score')}%  
**MTTD (Mean Time to Detect):** {ticket.get('mttd_seconds', 0)} seconds  
**MTTR (Mean Time to Resolve):** {ticket.get('mttr_seconds', 'N/A')} seconds  
**Incident Created:** {ticket.get('created_at')}  
**Incident Resolved:** {ticket.get('resolved_at', 'Unresolved')}  

---

## 1. Executive Summary & Root Cause
{ticket.get('root_cause_summary')}

---

## 2. Cascading Failure Impact Map
```text
{ticket.get('cascading_failure_map')}
```

---

## 3. Autonomous Diagnostic Investigation Timeline
The PulseOps AI agent executed the following ReAct loop:

{steps_md}

---

## 4. Remediation Fix Executed
```bash
{ticket.get('proposed_fix')}
```

---

## 5. Preventative Action Items
{action_items_md}

---

## 6. Audit Trail & Human Authorization
{audit_trail_md}
"""

    return PlainTextResponse(post_mortem_md, media_type="text/markdown")


@app.post("/api/integrations/webhook-test")
async def trigger_external_webhook(payload: Dict[str, Any]):
    """
    Pushes an incident notification card to a Discord or Slack webhook URL.
    """
    webhook_url = payload.get("webhook_url")
    ticket_id = payload.get("ticket_id")

    if not webhook_url:
        return {"status": "SKIPPED", "message": "No webhook URL supplied"}

    col = db_manager.get_collection("incidents")
    ticket = await col.find_one({"ticket_id": ticket_id}) or {}

    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Discord / Slack compatible payload format
            slack_payload = {
                "text": f"🚨 *PulseOps Incident Alert: {ticket.get('ticket_id', 'TEST')}* - {ticket.get('title', 'System Incident')}",
                "content": f"🚨 **PulseOps Incident Alert:** `{ticket.get('ticket_id')}` - {ticket.get('title')}\nSeverity: {ticket.get('severity')}\nRoot Cause: {ticket.get('root_cause_summary', 'N/A')[:200]}..."
            }
            res = await client.post(webhook_url, json=slack_payload)
            return {"status": "SUCCESS", "status_code": res.status_code}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


@app.get("/api/data/raw/{collection_name}")
async def get_raw_collection(collection_name: str, limit: int = 25):
    """
    Returns raw MongoDB documents for the interactive UI log/trace drawer.
    Allowed collections: server_logs, deployments, service_traces, db_clusters, ssl_gateways, node_metrics.
    """
    allowed = ["server_logs", "deployments", "service_traces", "db_clusters", "ssl_gateways", "node_metrics"]
    if collection_name not in allowed:
        raise HTTPException(status_code=400, detail="Invalid collection name")

    col = db_manager.get_collection(collection_name)
    cursor = await col.find({}, sort=[("timestamp", -1)], limit=limit)
    items = await cursor.to_list(limit)
    return items


@app.post("/api/reset")
async def reset_system():
    """Resets database and telemetry back to pristine baseline healthy state."""
    await reset_to_healthy(db_manager)
    telemetry_engine.set_healthy()
    return {"status": "RESET_COMPLETE", "message": "System restored to pristine healthy state."}


@app.get("/api/health")
async def health_check():
    """Health status and database mode."""
    return {
        "status": "ONLINE",
        "service": "PulseOps Autonomous Agent Backend",
        "is_mongodb_connected": db_manager.is_mongo(),
        "active_scenario": telemetry_engine.active_scenario,
        "is_critical": telemetry_engine.is_critical,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# --- Dummy E-Commerce Storefront APIs ---
# Allows judges to interact with a real dummy customer-facing website and trigger/experience outages live!

@app.post("/api/store/checkout")
async def store_checkout(payload: Optional[Dict[str, Any]] = None, background_tasks: BackgroundTasks = None):
    """
    Simulates customer checkout payment request on the storefront.
    """
    if telemetry_engine.active_scenario == "scenario_1":
        # Simulate the real failure
        err_msg = "Critical Connection Failure: pymongo connection pool exhausted (500/500). Checkout requests timing out after 30s."
        # Auto trigger agent if not already investigating
        if not telemetry_engine.active_incident_id and background_tasks:
            inc_id = f"INC-2026-{int(time.time()) % 10000:04d}"
            telemetry_engine.set_fault("scenario_1", inc_id)
            alert = AlertIn(
                service="payment-service",
                error_code="HTTP 500",
                message=err_msg,
                severity="P0 - Critical",
                scenario_id="scenario_1"
            )
            background_tasks.add_task(_execute_agent_investigation, inc_id, alert)

        raise HTTPException(
            status_code=500,
            detail={
                "status": "FAILED",
                "error": "HTTP 500 Internal Server Error: pymongo.errors.ConnectionFailure: Connections in pool (500/500) exhausted. Request timed out after 30000ms while waiting for available socket.",
                "service": "payment-service",
                "trace_id": "trace-500-pay-9921",
                "failing_hop": "payment-service -> mongodb-primary"
            }
        )

    return {
        "status": "SUCCESS",
        "order_id": f"ORD-{int(time.time()) % 100000:05d}",
        "amount": 249.99,
        "currency": "USD",
        "latency_ms": round(telemetry_engine.latency, 1),
        "message": "Payment captured and receipt dispatched successfully in 28ms!"
    }


@app.post("/api/store/login")
async def store_login(payload: Optional[Dict[str, Any]] = None, background_tasks: BackgroundTasks = None):
    """
    Simulates customer user authentication on the storefront.
    """
    if telemetry_engine.active_scenario == "scenario_2":
        err_msg = "Fatal: Memory Leak & CPU spike (98.4%) on auth-service worker pod. Container CrashLoopBackOff."
        if not telemetry_engine.active_incident_id and background_tasks:
            inc_id = f"INC-2026-{int(time.time()) % 10000:04d}"
            telemetry_engine.set_fault("scenario_2", inc_id)
            alert = AlertIn(
                service="auth-service",
                error_code="HTTP 503",
                message=err_msg,
                severity="P0 - Critical",
                scenario_id="scenario_2"
            )
            background_tasks.add_task(_execute_agent_investigation, inc_id, alert)

        raise HTTPException(
            status_code=503,
            detail={
                "status": "FAILED",
                "error": "HTTP 503 Service Unavailable: auth-service memory allocation error (Heap quota exceeded 3.96GB / CPU pinned at 98.4%). Linux OOM killer terminated process.",
                "service": "auth-service",
                "trace_id": "trace-503-auth-4412",
                "failing_hop": "api-gateway -> auth-service"
            }
        )

    return {
        "status": "SUCCESS",
        "user": "alex.customer@apexstore.io",
        "role": "VIP Customer",
        "token": "jwt_live_sess_89a0b1",
        "latency_ms": round(telemetry_engine.latency, 1),
        "message": "User authenticated successfully. Active JWT session valid."
    }


@app.post("/api/store/track-order")
async def store_track_order(payload: Optional[Dict[str, Any]] = None, background_tasks: BackgroundTasks = None):
    """
    Simulates order fulfillment & tracking lookup through the API Gateway.
    """
    if telemetry_engine.active_scenario == "scenario_3":
        err_msg = "Gateway Timeout: SSL certificate expired for upstream orders.internal.infra:443. Handshake terminating."
        if not telemetry_engine.active_incident_id and background_tasks:
            inc_id = f"INC-2026-{int(time.time()) % 10000:04d}"
            telemetry_engine.set_fault("scenario_3", inc_id)
            alert = AlertIn(
                service="api-gateway",
                error_code="HTTP 504",
                message=err_msg,
                severity="P1 - High",
                scenario_id="scenario_3"
            )
            background_tasks.add_task(_execute_agent_investigation, inc_id, alert)

        raise HTTPException(
            status_code=504,
            detail={
                "status": "FAILED",
                "error": "HTTP 504 Gateway Timeout: SSL certificate expired for upstream orders.internal.infra:443. Envoy proxy upstream TLS handshake failed.",
                "service": "api-gateway",
                "trace_id": "trace-504-gw-7810",
                "failing_hop": "api-gateway -> orders.internal.infra (TLS Handshake Failed)"
            }
        )

    return {
        "status": "SUCCESS",
        "tracking_number": "TRK-981244-FEDEX",
        "carrier": "FedEx Express Next-Day",
        "status_text": "Out for delivery in San Francisco, CA",
        "latency_ms": round(telemetry_engine.latency, 1),
        "message": "Order tracking retrieved via Envoy gateway in 16ms."
    }

