"""
Seed Data & Mock Database Populate for PulseOps
Generates production-grade realistic telemetry, logs, traces, and deployments
for 3 distinct outage scenarios plus healthy baseline states.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

def get_iso_time(offset_minutes: float = 0) -> str:
    dt = datetime.now(timezone.utc) + timedelta(minutes=offset_minutes)
    return dt.isoformat()

def generate_baseline_data() -> Dict[str, List[Dict[str, Any]]]:
    """Baseline healthy cluster state"""
    now = datetime.now(timezone.utc)
    
    server_logs = [
        {
            "_id": "log-base-001",
            "service_name": "api-gateway",
            "level": "INFO",
            "timestamp": (now - timedelta(minutes=20)).isoformat(),
            "message": "Gateway route table refreshed: 24 active routing rules loaded successfully.",
            "trace_id": "tr-base-101",
            "host": "gw-pod-node-01"
        },
        {
            "_id": "log-base-002",
            "service_name": "auth-service",
            "level": "INFO",
            "timestamp": (now - timedelta(minutes=18)).isoformat(),
            "message": "JWT token verification cache hit ratio: 94.2%. Worker threads healthy.",
            "trace_id": "tr-base-102",
            "host": "auth-pod-worker-02"
        },
        {
            "_id": "log-base-003",
            "service_name": "payment-service",
            "level": "INFO",
            "timestamp": (now - timedelta(minutes=15)).isoformat(),
            "message": "Stripe webhook processor synchronized with ledger queue.",
            "trace_id": "tr-base-103",
            "host": "pay-pod-worker-01"
        },
        {
            "_id": "log-base-004",
            "service_name": "order-service",
            "level": "INFO",
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
            "message": "Order fulfillment queue idle; 0 pending backlogs.",
            "trace_id": "tr-base-104",
            "host": "order-pod-01"
        }
    ]

    deployments = [
        {
            "_id": "dep-base-01",
            "service_name": "api-gateway",
            "commit_hash": "c42e181",
            "author": "sarah.dev@pulseops.io",
            "timestamp": (now - timedelta(hours=4)).isoformat(),
            "title": "chore(proxy): optimize keepalive idle timeout to 60s",
            "status": "SUCCESSFUL",
            "environment": "production",
            "config_diff": "- keepalive_timeout: 30s\n+ keepalive_timeout: 60s"
        },
        {
            "_id": "dep-base-02",
            "service_name": "payment-service",
            "commit_hash": "b2910fa",
            "author": "alex.chen@pulseops.io",
            "timestamp": (now - timedelta(hours=6)).isoformat(),
            "title": "feat(payments): support apple pay token verification",
            "status": "SUCCESSFUL",
            "environment": "production",
            "config_diff": "+ ENABLE_APPLE_PAY: true\n+ APPLE_MERCHANT_ID: merch_live_9921"
        }
    ]

    db_clusters = [
        {
            "_id": "dbc-mongo-01",
            "db_cluster": "mongodb-primary",
            "status": "HEALTHY",
            "active_connections": 42,
            "max_connections": 500,
            "queued_queries": 0,
            "lock_wait_ratio": 0.01,
            "slow_queries_count": 0,
            "updated_at": now.isoformat()
        },
        {
            "_id": "dbc-redis-01",
            "db_cluster": "redis-cache",
            "status": "HEALTHY",
            "active_connections": 18,
            "max_connections": 1000,
            "queued_queries": 0,
            "lock_wait_ratio": 0.0,
            "memory_usage_mb": 420,
            "updated_at": now.isoformat()
        }
    ]

    service_traces = [
        {
            "_id": "trace-base-001",
            "trace_id": "tr-base-101",
            "root_service": "api-gateway",
            "duration_ms": 32,
            "status_code": 200,
            "spans": [
                {"service": "api-gateway", "duration_ms": 5, "status": "OK"},
                {"service": "auth-service", "duration_ms": 12, "status": "OK"},
                {"service": "payment-service", "duration_ms": 15, "status": "OK"}
            ],
            "timestamp": (now - timedelta(minutes=5)).isoformat()
        }
    ]

    node_metrics = [
        {
            "_id": "node-k8s-01",
            "node_name": "k8s-node-worker-01",
            "cpu_usage_pct": 24.5,
            "ram_usage_pct": 42.1,
            "disk_io_pct": 11.2,
            "timestamp": now.isoformat()
        },
        {
            "_id": "node-k8s-02",
            "node_name": "k8s-node-worker-02",
            "cpu_usage_pct": 28.0,
            "ram_usage_pct": 45.3,
            "disk_io_pct": 14.0,
            "timestamp": now.isoformat()
        }
    ]

    ssl_gateways = [
        {
            "_id": "ssl-01",
            "domain": "api.pulseops.internal",
            "issuer": "Let's Encrypt Authority X3",
            "valid_from": (now - timedelta(days=60)).isoformat(),
            "valid_until": (now + timedelta(days=30)).isoformat(),
            "status": "VALID",
            "upstream_target": "api-gateway.prod.svc.cluster.local:443",
            "days_to_expiry": 30
        },
        {
            "_id": "ssl-02",
            "domain": "orders.internal.infra",
            "issuer": "DigiCert Global Root G2",
            "valid_from": (now - timedelta(days=80)).isoformat(),
            "valid_until": (now + timedelta(days=10)).isoformat(),
            "status": "VALID",
            "upstream_target": "order-service.prod.svc.cluster.local:8443",
            "days_to_expiry": 10
        }
    ]

    return {
        "server_logs": server_logs,
        "deployments": deployments,
        "db_clusters": db_clusters,
        "service_traces": service_traces,
        "node_metrics": node_metrics,
        "ssl_gateways": ssl_gateways
    }


def generate_scenario_1_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Scenario 1: HTTP 500 Outage
    Root Cause: Bad config deploy in payment-service capped maxPoolSize & connection pool exhausted (500/500).
    """
    now = datetime.now(timezone.utc)
    t_minus_10m = (now - timedelta(minutes=10)).isoformat()
    t_minus_8m = (now - timedelta(minutes=8)).isoformat()
    t_minus_4m = (now - timedelta(minutes=4)).isoformat()
    t_minus_1m = (now - timedelta(minutes=1)).isoformat()

    server_logs = [
        {
            "_id": "log-s1-001",
            "service_name": "payment-service",
            "level": "CRITICAL",
            "timestamp": t_minus_4m,
            "message": "pymongo.errors.ConnectionFailure: Connections in pool (500/500) exhausted. Request timed out after 30000ms while waiting for available socket. Active sockets: 500, pending checkout callers: 218.",
            "trace_id": "trace-500-pay-9921",
            "host": "k8s-pod-payment-7a2e",
            "stack_trace": "File \"/app/handlers/checkout.py\", line 142 in process_payment\n  db.orders.insert_one(payload)\nFile \"/venv/pymongo/pool.py\", line 1245 in get_socket\n  raise ConnectionFailure('Pool exhausted (500/500)')"
        },
        {
            "_id": "log-s1-002",
            "service_name": "payment-service",
            "level": "ERROR",
            "timestamp": t_minus_1m,
            "message": "HTTP 500 Internal Server Error returned to downstream API Gateway on endpoint POST /v1/checkout/charge. Duration: 30012ms.",
            "trace_id": "trace-500-pay-9921",
            "host": "k8s-pod-payment-7a2e"
        },
        {
            "_id": "log-s1-003",
            "service_name": "api-gateway",
            "level": "ERROR",
            "timestamp": t_minus_1m,
            "message": "Upstream service payment-service failed with HTTP 500. Circuit breaker half-open; tripping open threshold.",
            "trace_id": "trace-500-pay-9921",
            "host": "gw-node-01"
        }
    ]

    deployments = [
        {
            "_id": "dep-s1-001",
            "service_name": "payment-service",
            "commit_hash": "f10d93a",
            "author": "alex.chen@pulseops.io",
            "timestamp": t_minus_10m,
            "title": "refactor(db): update maxPoolSize and query batch settings",
            "status": "DEPLOYED",
            "environment": "production",
            "config_diff": "- maxPoolSize: 500\n- waitQueueTimeoutMS: 5000\n+ maxPoolSize: 10\n+ waitQueueTimeoutMS: 30000\n+ auto_reconnect: false"
        }
    ]

    db_clusters = [
        {
            "_id": "dbc-mongo-01",
            "db_cluster": "mongodb-primary",
            "status": "CRITICAL_EXHAUSTED",
            "active_connections": 500,
            "max_connections": 500,
            "queued_queries": 342,
            "lock_wait_ratio": 0.94,
            "slow_queries_count": 89,
            "diagnostic_summary": "Connection pool reached ceiling limit (500/500). 342 client queries blocked in waitQueue. High mutex contention.",
            "updated_at": now.isoformat()
        }
    ]

    service_traces = [
        {
            "_id": "trace-s1-001",
            "trace_id": "trace-500-pay-9921",
            "root_service": "api-gateway",
            "duration_ms": 30045,
            "status_code": 500,
            "spans": [
                {"service": "react-web", "duration_ms": 30045, "status": "ERROR", "error_info": "HTTP 500 Internal Server Error"},
                {"service": "api-gateway", "duration_ms": 30020, "status": "ERROR", "error_info": "Upstream timeout / 500 from payment-service"},
                {"service": "payment-service", "duration_ms": 30005, "status": "CRITICAL", "error_info": "pymongo.errors.ConnectionFailure (500/500 exhausted)"},
                {"service": "mongodb-primary", "duration_ms": 30000, "status": "TIMEOUT", "error_info": "Socket waitQueue timeout"}
            ],
            "failing_hop": "payment-service -> mongodb-primary",
            "timestamp": t_minus_1m
        }
    ]

    node_metrics = [
        {
            "_id": "node-k8s-03",
            "node_name": "k8s-node-worker-03",
            "cpu_usage_pct": 68.2,
            "ram_usage_pct": 82.5,
            "disk_io_pct": 45.0,
            "timestamp": now.isoformat()
        }
    ]

    return {
        "server_logs": server_logs,
        "deployments": deployments,
        "db_clusters": db_clusters,
        "service_traces": service_traces,
        "node_metrics": node_metrics
    }


def generate_scenario_2_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Scenario 2: HTTP 503 Outage
    Root Cause: Memory leak and runaway CPU spike (98%) on auth-service after commit a8f92b.
    """
    now = datetime.now(timezone.utc)
    t_minus_15m = (now - timedelta(minutes=15)).isoformat()
    t_minus_7m = (now - timedelta(minutes=7)).isoformat()
    t_minus_2m = (now - timedelta(minutes=2)).isoformat()

    server_logs = [
        {
            "_id": "log-s2-001",
            "service_name": "auth-service",
            "level": "CRITICAL",
            "timestamp": t_minus_7m,
            "message": "FATAL: Node/Python worker MemoryError: uncollectable cyclic reference in JWT session cache worker. Heap allocation exceeded quota (3890MB / 4096MB). CPU throttle reached 98.4%. Event loop starvation detected.",
            "trace_id": "trace-503-auth-4412",
            "host": "auth-service-pod-7b99c",
            "stack_trace": "File \"/app/auth/session_store.py\", line 88 in cache_token\n  _global_token_revocation_map[user_id].append(raw_token)\nMemoryError: unable to allocate 16384 bytes in cache buffer"
        },
        {
            "_id": "log-s2-002",
            "service_name": "auth-service",
            "level": "ERROR",
            "timestamp": t_minus_2m,
            "message": "Process received SIGTERM from Linux OOM Killer. Service unavailable; dropping incoming HTTP requests.",
            "trace_id": "trace-503-auth-4412",
            "host": "auth-service-pod-7b99c"
        },
        {
            "_id": "log-s2-003",
            "service_name": "api-gateway",
            "level": "ERROR",
            "timestamp": t_minus_2m,
            "message": "HTTP 503 Service Unavailable: connection refused by upstream auth-service:8080. Pod auth-service-pod-7b99c CrashLoopBackOff.",
            "trace_id": "trace-503-auth-4412",
            "host": "gw-node-02"
        }
    ]

    deployments = [
        {
            "_id": "dep-s2-001",
            "service_name": "auth-service",
            "commit_hash": "a8f92b",
            "author": "dev-sarah@pulseops.io",
            "timestamp": t_minus_15m,
            "title": "feat(jwt): add distributed token revocation cache with in-memory map without TTL eviction",
            "status": "DEPLOYED",
            "environment": "production",
            "config_diff": "+ _global_token_revocation_map = defaultdict(list)\n- cache.expire(token, ttl=3600)\n+ # Kept indefinitely for zero auth lag\n+ _global_token_revocation_map[user_id].append(token)"
        }
    ]

    node_metrics = [
        {
            "_id": "node-auth-01",
            "node_name": "auth-service-pod-7b99c",
            "cpu_usage_pct": 98.4,
            "ram_usage_pct": 96.8,
            "disk_io_pct": 12.1,
            "timestamp": now.isoformat(),
            "details": "CPU throttled at 98.4%. RAM: 3960MB / 4096MB (96.8%). OOM kills in last 10m: 4."
        }
    ]

    service_traces = [
        {
            "_id": "trace-s2-001",
            "trace_id": "trace-503-auth-4412",
            "root_service": "api-gateway",
            "duration_ms": 5012,
            "status_code": 503,
            "spans": [
                {"service": "react-web", "duration_ms": 5012, "status": "ERROR", "error_info": "503 Service Unavailable"},
                {"service": "api-gateway", "duration_ms": 5005, "status": "ERROR", "error_info": "Upstream DEADLINE_EXCEEDED (5000ms)"},
                {"service": "auth-service", "duration_ms": 5000, "status": "DEADLINE_EXCEEDED", "error_info": "OOM SIGTERM / Event loop starved"}
            ],
            "failing_hop": "api-gateway -> auth-service",
            "timestamp": t_minus_2m
        }
    ]

    return {
        "server_logs": server_logs,
        "deployments": deployments,
        "node_metrics": node_metrics,
        "service_traces": service_traces
    }


def generate_scenario_3_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Scenario 3: HTTP 504 Outage
    Root Cause: SSL Certificate expired on orders.internal.infra; API Gateway TLS handshake fails -> 504 timeout.
    """
    now = datetime.now(timezone.utc)
    cert_expired_time = (now - timedelta(minutes=45)).isoformat()
    t_minus_8m = (now - timedelta(minutes=8)).isoformat()
    t_minus_2m = (now - timedelta(minutes=2)).isoformat()

    server_logs = [
        {
            "_id": "log-s3-001",
            "service_name": "api-gateway",
            "level": "CRITICAL",
            "timestamp": t_minus_8m,
            "message": "envoy.gateway.proxy: upstream SSL handshake failed: certificate has expired (code: CERT_HAS_EXPIRED) for upstream orders.internal.infra:443. SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED.",
            "trace_id": "trace-504-gw-7810",
            "host": "gw-edge-ingress-01"
        },
        {
            "_id": "log-s3-002",
            "service_name": "api-gateway",
            "level": "ERROR",
            "timestamp": t_minus_2m,
            "message": "HTTP 504 Gateway Timeout dispatched to downstream client for path /api/v2/orders/fulfillment after TLS handshake abort. Latency: 15000ms.",
            "trace_id": "trace-504-gw-7810",
            "host": "gw-edge-ingress-01"
        }
    ]

    ssl_gateways = [
        {
            "_id": "ssl-02",
            "domain": "orders.internal.infra",
            "issuer": "DigiCert Internal Global CA",
            "valid_from": (now - timedelta(days=90)).isoformat(),
            "valid_until": cert_expired_time,
            "status": "EXPIRED",
            "upstream_target": "order-service.prod.svc.cluster.local:8443",
            "days_to_expiry": -1,
            "error_detail": "Certificate expired 45 minutes ago. Ingress TLS handshake terminating with SSL routines verify error."
        }
    ]

    service_traces = [
        {
            "_id": "trace-s3-001",
            "trace_id": "trace-504-gw-7810",
            "root_service": "api-gateway",
            "duration_ms": 15024,
            "status_code": 504,
            "spans": [
                {"service": "react-web", "duration_ms": 15024, "status": "ERROR", "error_info": "504 Gateway Timeout"},
                {"service": "api-gateway", "duration_ms": 15010, "status": "ERROR", "error_info": "CERT_HAS_EXPIRED on upstream TLS handshake"},
                {"service": "order-service", "duration_ms": 0, "status": "UNREACHABLE", "error_info": "TLS handshake rejected by proxy"}
            ],
            "failing_hop": "api-gateway -> orders.internal.infra (TLS)",
            "timestamp": t_minus_2m
        }
    ]

    return {
        "server_logs": server_logs,
        "ssl_gateways": ssl_gateways,
        "service_traces": service_traces
    }


async def seed_database(db_manager):
    """Seed the database with baseline data if empty."""
    cols = ["server_logs", "deployments", "db_clusters", "service_traces", "node_metrics", "ssl_gateways"]
    baseline = generate_baseline_data()
    for col_name in cols:
        col = db_manager.get_collection(col_name)
        count = await col.count_documents({})
        if count == 0 and col_name in baseline:
            await col.insert_many(baseline[col_name])


async def inject_scenario_data(db_manager, scenario_id: str):
    """Inject scenario-specific fault data into MongoDB/In-memory store."""
    if scenario_id == "scenario_1":
        data = generate_scenario_1_data()
    elif scenario_id == "scenario_2":
        data = generate_scenario_2_data()
    elif scenario_id == "scenario_3":
        data = generate_scenario_3_data()
    else:
        raise ValueError(f"Unknown scenario ID: {scenario_id}")

    for col_name, docs in data.items():
        col = db_manager.get_collection(col_name)
        for doc in docs:
            # Upsert or replace
            existing = await col.find_one({"_id": doc["_id"]})
            if existing:
                await col.update_one({"_id": doc["_id"]}, {"$set": doc})
            else:
                await col.insert_one(doc)


async def reset_to_healthy(db_manager):
    """Reset database to healthy baseline state."""
    cols = ["server_logs", "deployments", "db_clusters", "service_traces", "node_metrics", "ssl_gateways", "incidents"]
    for col_name in cols:
        col = db_manager.get_collection(col_name)
        await col.delete_many({})
    await seed_database(db_manager)
