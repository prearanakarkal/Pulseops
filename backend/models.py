"""
Pydantic Data Models & Strict Schemas for PulseOps
"""

from typing import List, Dict, Any, Optional, Literal, Union
from pydantic import BaseModel, Field, model_validator
from datetime import datetime

# --- Alert Models ---
class AlertIn(BaseModel):
    service: str = Field(..., description="Target service affected, e.g., 'payment-service'")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())
    error_code: str = Field(..., description="e.g. HTTP 500, HTTP 503, HTTP 504")
    message: str = Field(..., description="Alert description or error string")
    severity: Literal["P0 - Critical", "P1 - High", "P2 - Medium", "P3 - Low"] = "P0 - Critical"
    scenario_id: Optional[str] = Field(None, description="Preset scenario mapping (scenario_1, scenario_2, scenario_3)")


class ChaosTriggerRequest(BaseModel):
    scenario_id: Optional[str] = Field(None, description="The preset chaos scenario to inject")
    scenario: Optional[Union[str, int]] = Field(None, description="Alternative field for scenario (e.g. 1, 2, 3)")
    auto_trigger_agent: bool = Field(True, description="Whether to automatically launch the autonomous ReAct investigation agent")

    @model_validator(mode="before")
    @classmethod
    def normalize_scenario(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw = data.get("scenario_id") or data.get("scenario")
            if raw is not None:
                if str(raw) in ("1", "scenario_1"):
                    data["scenario_id"] = "scenario_1"
                elif str(raw) in ("2", "scenario_2"):
                    data["scenario_id"] = "scenario_2"
                elif str(raw) in ("3", "scenario_3"):
                    data["scenario_id"] = "scenario_3"
                else:
                    data["scenario_id"] = str(raw)
        return data


# --- Diagnostic Tool Schemas ---
class LogAnalyzerInput(BaseModel):
    service_name: str = Field(..., description="Service identifier, e.g. 'payment-service', 'auth-service', 'api-gateway'")
    level: str = Field("ERROR", description="Log level filter: 'ERROR', 'CRITICAL', 'FATAL', 'ALL'")
    limit: int = Field(10, description="Max logs to return")

class LogEntry(BaseModel):
    id: str
    service_name: str
    level: str
    timestamp: str
    message: str
    trace_id: Optional[str] = None
    stack_trace: Optional[str] = None

class LogAnalyzerOutput(BaseModel):
    service_name: str
    matched_logs_count: int
    logs: List[Dict[str, Any]]
    summary: str


class DeploymentHistoryInput(BaseModel):
    service_name: str = Field(..., description="Service identifier to inspect CI/CD git records")
    limit: int = Field(5, description="Number of recent deployments to fetch")

class DeploymentHistoryOutput(BaseModel):
    service_name: str
    deployments: List[Dict[str, Any]]
    recent_commit: Optional[str] = None
    has_recent_deploy: bool


class DatabaseHealthInput(BaseModel):
    db_cluster: str = Field(..., description="Cluster identifier, e.g., 'mongodb-primary', 'redis-cache'")

class DatabaseHealthOutput(BaseModel):
    db_cluster: str
    status: str
    active_connections: int
    max_connections: int
    connection_utilization_pct: float
    queued_queries: int
    lock_wait_ratio: float
    slow_queries_count: int
    diagnostic_summary: str


class MicroserviceTraceInput(BaseModel):
    trace_id: str = Field(..., description="Distributed correlation trace ID, e.g. 'trace-500-pay-9921'")

class MicroserviceTraceOutput(BaseModel):
    trace_id: str
    status_code: int
    duration_ms: int
    failing_hop: Optional[str] = None
    spans: List[Dict[str, Any]]
    diagnosis: str


class InfrastructureMetricsInput(BaseModel):
    node_name: str = Field(..., description="Node or container host name, e.g., 'k8s-node-worker-03', 'auth-service-pod-7b99c'")

class InfrastructureMetricsOutput(BaseModel):
    node_name: str
    cpu_usage_pct: float
    ram_usage_pct: float
    disk_io_pct: float
    details: Optional[str] = None
    is_throttled: bool


class SslGatewayInput(BaseModel):
    domain: str = Field(..., description="Target internal or external domain, e.g., 'orders.internal.infra', 'api.pulseops.internal'")

class SslGatewayOutput(BaseModel):
    domain: str
    status: str
    days_to_expiry: int
    valid_until: str
    issuer: str
    upstream_target: str
    error_detail: Optional[str] = None


# --- Incident Ticket & Agent Step Schemas ---
class AgentStep(BaseModel):
    incident_id: str
    step_index: int
    step_number: Optional[int] = None
    type: str
    step_type: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    content: str
    thought: Optional[str] = None
    observation: Optional[str] = None
    conclusion: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class IncidentTicket(BaseModel):
    ticket_id: str = Field(..., description="Unique incident identifier, e.g. INC-2026-001")
    title: str
    severity: Literal["P0 - Critical", "P1 - High", "P2 - Medium", "P3 - Low"]
    confidence_score: int = Field(..., ge=0, le=100, description="Agent confidence score percentage")
    root_cause_summary: str = Field(..., description="Plain-English technical synthesis of root cause")
    cascading_failure_map: str = Field(..., description="Downstream impact chain, e.g., Mongo -> Payment -> Gateway -> Client")
    proposed_fix: str = Field(..., description="Exact command or rollback script to execute")
    action_items: List[str] = Field(default_factory=list, description="Step-by-step checklist")
    status: Literal["INVESTIGATING", "PENDING_APPROVAL", "RESOLVED", "REJECTED"] = "PENDING_APPROVAL"
    mttd_seconds: float = Field(0.0, description="Mean time to detect in seconds")
    mttr_seconds: Optional[float] = Field(None, description="Mean time to resolve in seconds once approved")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resolved_at: Optional[str] = None
    audit_trail: List[str] = Field(default_factory=list)
    logs_examined: List[str] = Field(default_factory=list)
    traces_examined: List[str] = Field(default_factory=list)
    commits_examined: List[str] = Field(default_factory=list)
    scenario_id: Optional[str] = None


class ApprovalRequest(BaseModel):
    approved: bool = True
    override_notes: Optional[str] = None
    new_severity: Optional[str] = None
    remediation_command: Optional[str] = None


class TelemetryPoint(BaseModel):
    timestamp: str
    cpu_usage: float
    ram_usage: float
    latency_ms: float
    error_rate_pct: float
    active_connections: int
    status: Literal["HEALTHY", "WARNING", "CRITICAL"]
    active_scenario: Optional[str] = None
