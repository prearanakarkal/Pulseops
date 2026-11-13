"""
PulseOps Diagnostic Toolset
6 Core SRE Diagnostic Tools + Structured Incident Ticket Generator.
All tools query MongoDB (or in-memory fallback) and return validated JSON.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.database import db_manager
from backend.models import (
    LogAnalyzerOutput,
    DeploymentHistoryOutput,
    DatabaseHealthOutput,
    MicroserviceTraceOutput,
    InfrastructureMetricsOutput,
    SslGatewayOutput,
    IncidentTicket
)

logger = logging.getLogger("pulseops.tools")

async def log_analyzer(service_name: str, level: str = "ERROR", limit: int = 10) -> Dict[str, Any]:
    """
    Queries server_logs collection for ERROR, CRITICAL, or FATAL stack traces and log messages.
    """
    col = db_manager.get_collection("server_logs")
    query: Dict[str, Any] = {"service_name": service_name}
    if level and level.upper() != "ALL":
        query["level"] = {"$in": [level.upper(), "CRITICAL", "FATAL"]}
        
    cursor = await col.find(query, sort=[("timestamp", -1)], limit=limit)
    logs = await cursor.to_list(limit)

    summary = f"Found {len(logs)} log records matching service '{service_name}' with level '{level}'."
    if logs:
        last_log = logs[0]
        summary += f" Latest message: [{last_log.get('level')}] {last_log.get('message')[:120]}..."

    output = LogAnalyzerOutput(
        service_name=service_name,
        matched_logs_count=len(logs),
        logs=logs,
        summary=summary
    )
    return output.model_dump()


async def deployment_history_inspector(service_name: str, limit: int = 5) -> Dict[str, Any]:
    """
    Queries deployments collection for recent CI/CD git commits, author metadata, and configuration diffs.
    """
    col = db_manager.get_collection("deployments")
    cursor = await col.find({"service_name": service_name}, sort=[("timestamp", -1)], limit=limit)
    deployments = await cursor.to_list(limit)

    recent_commit = deployments[0].get("commit_hash") if deployments else None
    output = DeploymentHistoryOutput(
        service_name=service_name,
        deployments=deployments,
        recent_commit=recent_commit,
        has_recent_deploy=len(deployments) > 0
    )
    return output.model_dump()


async def database_health_prober(db_cluster: str) -> Dict[str, Any]:
    """
    Checks simulated database cluster health, active connection pool ratios, slow queries, and lock wait times.
    """
    col = db_manager.get_collection("db_clusters")
    doc = await col.find_one({"db_cluster": db_cluster})

    if not doc:
        # Graceful default prober fallback
        return {
            "db_cluster": db_cluster,
            "status": "UNKNOWN",
            "active_connections": 0,
            "max_connections": 500,
            "connection_utilization_pct": 0.0,
            "queued_queries": 0,
            "lock_wait_ratio": 0.0,
            "slow_queries_count": 0,
            "diagnostic_summary": f"No active metrics found for cluster {db_cluster}."
        }

    max_c = doc.get("max_connections", 500)
    active_c = doc.get("active_connections", 0)
    utilization = round((active_c / max_c) * 100, 2) if max_c > 0 else 0.0

    output = DatabaseHealthOutput(
        db_cluster=db_cluster,
        status=doc.get("status", "HEALTHY"),
        active_connections=active_c,
        max_connections=max_c,
        connection_utilization_pct=utilization,
        queued_queries=doc.get("queued_queries", 0),
        lock_wait_ratio=doc.get("lock_wait_ratio", 0.0),
        slow_queries_count=doc.get("slow_queries_count", 0),
        diagnostic_summary=doc.get("diagnostic_summary", f"Connection pool at {utilization}% utilization.")
    )
    return output.model_dump()


async def microservice_trace_evaluator(trace_id: str) -> Dict[str, Any]:
    """
    Queries service_traces to inspect distributed request spans (e.g., Web -> Gateway -> Service -> DB)
    and pinpoint the exact failing hop.
    """
    col = db_manager.get_collection("service_traces")
    doc = await col.find_one({"trace_id": trace_id})

    if not doc:
        # Fallback trace lookup if not found
        cursor = await col.find({}, sort=[("timestamp", -1)], limit=1)
        items = await cursor.to_list(1)
        doc = items[0] if items else None

    if not doc:
        return {
            "trace_id": trace_id,
            "status_code": 500,
            "duration_ms": 0,
            "failing_hop": "Unknown hop",
            "spans": [],
            "diagnosis": f"Trace {trace_id} not located in distributed tracing store."
        }

    diagnosis = f"Trace duration {doc.get('duration_ms')}ms with root status code {doc.get('status_code')}."
    if doc.get("failing_hop"):
        diagnosis += f" Failing hop identified: {doc.get('failing_hop')}."

    output = MicroserviceTraceOutput(
        trace_id=doc.get("trace_id", trace_id),
        status_code=doc.get("status_code", 500),
        duration_ms=doc.get("duration_ms", 0),
        failing_hop=doc.get("failing_hop"),
        spans=doc.get("spans", []),
        diagnosis=diagnosis
    )
    return output.model_dump()


async def infrastructure_metrics_checker(node_name: str) -> Dict[str, Any]:
    """
    Fetches real-time CPU, RAM, and Disk I/O telemetry stats for a specific worker node or container.
    """
    col = db_manager.get_collection("node_metrics")
    doc = await col.find_one({"node_name": node_name})

    if not doc:
        # Fallback lookup
        cursor = await col.find({}, sort=[("timestamp", -1)], limit=1)
        items = await cursor.to_list(1)
        doc = items[0] if items else None

    if not doc:
        return {
            "node_name": node_name,
            "cpu_usage_pct": 25.0,
            "ram_usage_pct": 40.0,
            "disk_io_pct": 10.0,
            "details": "Default nominal host telemetry.",
            "is_throttled": False
        }

    cpu = doc.get("cpu_usage_pct", 20.0)
    ram = doc.get("ram_usage_pct", 30.0)
    throttled = cpu > 90.0 or ram > 90.0

    output = InfrastructureMetricsOutput(
        node_name=doc.get("node_name", node_name),
        cpu_usage_pct=cpu,
        ram_usage_pct=ram,
        disk_io_pct=doc.get("disk_io_pct", 10.0),
        details=doc.get("details", f"Host telemetry recorded at {doc.get('timestamp')}."),
        is_throttled=throttled
    )
    return output.model_dump()


async def ssl_and_gateway_validator(domain: str) -> Dict[str, Any]:
    """
    Checks simulated SSL certificate expiry dates and API gateway routing tables.
    """
    col = db_manager.get_collection("ssl_gateways")
    doc = await col.find_one({"domain": domain})

    if not doc:
        # Fallback first doc
        cursor = await col.find({}, sort=[("timestamp", -1)], limit=1)
        items = await cursor.to_list(1)
        doc = items[0] if items else None

    if not doc:
        return {
            "domain": domain,
            "status": "UNKNOWN",
            "days_to_expiry": 0,
            "valid_until": "Unknown",
            "issuer": "Internal CA",
            "upstream_target": "none",
            "error_detail": f"Domain {domain} not registered in gateway TLS config."
        }

    output = SslGatewayOutput(
        domain=doc.get("domain", domain),
        status=doc.get("status", "VALID"),
        days_to_expiry=doc.get("days_to_expiry", 30),
        valid_until=doc.get("valid_until", ""),
        issuer=doc.get("issuer", "Unknown"),
        upstream_target=doc.get("upstream_target", ""),
        error_detail=doc.get("error_detail")
    )
    return output.model_dump()


async def create_incident_ticket(
    ticket_id: str,
    title: str,
    severity: str,
    confidence_score: int,
    root_cause_summary: str,
    cascading_failure_map: str,
    proposed_fix: str,
    action_items: List[str],
    mttd_seconds: float,
    logs_examined: List[str] = None,
    traces_examined: List[str] = None,
    commits_examined: List[str] = None,
    scenario_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates and persists the final structured Incident Ticket in 'PENDING_APPROVAL' state.
    """
    col = db_manager.get_collection("incidents")
    
    ticket = IncidentTicket(
        ticket_id=ticket_id,
        title=title,
        severity=severity,
        confidence_score=confidence_score,
        root_cause_summary=root_cause_summary,
        cascading_failure_map=cascading_failure_map,
        proposed_fix=proposed_fix,
        action_items=action_items,
        status="PENDING_APPROVAL",
        mttd_seconds=mttd_seconds,
        created_at=datetime.utcnow().isoformat(),
        audit_trail=[f"[{datetime.utcnow().isoformat()}] Incident ticket created by Autonomous SRE Agent."],
        logs_examined=logs_examined or [],
        traces_examined=traces_examined or [],
        commits_examined=commits_examined or [],
        scenario_id=scenario_id
    )

    ticket_doc = ticket.model_dump()
    ticket_doc["_id"] = ticket.ticket_id

    # Check if exists and update or insert
    existing = await col.find_one({"_id": ticket.ticket_id})
    if existing:
        await col.update_one({"_id": ticket.ticket_id}, {"$set": ticket_doc})
    else:
        await col.insert_one(ticket_doc)

    logger.info("Persisted incident ticket %s in PENDING_APPROVAL status", ticket.ticket_id)
    return ticket_doc


# Tool Registry mapping for dynamic invocation
TOOL_REGISTRY = {
    "log_analyzer": log_analyzer,
    "deployment_history_inspector": deployment_history_inspector,
    "database_health_prober": database_health_prober,
    "microservice_trace_evaluator": microservice_trace_evaluator,
    "infrastructure_metrics_checker": infrastructure_metrics_checker,
    "ssl_and_gateway_validator": ssl_and_gateway_validator,
    "create_incident_ticket": create_incident_ticket
}
