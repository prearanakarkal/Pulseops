import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Flame,
  RefreshCw,
  Terminal,
  Brain,
  Wrench,
  Eye,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Server,
  Database,
  Globe,
  KeyRound,
  Layers,
  Clock,
  Download,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  GitFork,
  FileText,
  GitCommit,
  Cpu,
  Zap,
  ListChecks,
  X,
  ShoppingCart,
  SlidersHorizontal,
  ChevronUp,
  Compass
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis
} from 'recharts';

export default function DashboardPage({ onNavigateToStore }) {
  // Telemetry & Cluster State
  const [telemetry, setTelemetry] = useState({
    cpu_usage: 24.5,
    ram_usage: 41.2,
    latency_ms: 38.0,
    error_rate_pct: 0.02,
    active_connections: 42,
    status: 'HEALTHY',
    active_scenario: null
  });
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    const initial = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      initial.push({
        time: new Date(now - i * 1000).toLocaleTimeString(),
        cpu_usage: 24.5,
        ram_usage: 41.2,
        latency_ms: 38.0,
        error_rate_pct: 0.02,
        active_connections: 42
      });
    }
    return initial;
  });
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Incidents & Agent Investigation State
  const [incidents, setIncidents] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [agentSteps, setAgentSteps] = useState([]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Raw Data Drawer State
  const [rawTab, setRawTab] = useState('server_logs');
  const [rawData, setRawData] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState('');
  const [isRawExpanded, setIsRawExpanded] = useState(true);

  // Selected Node in Topology
  const [selectedNode, setSelectedNode] = useState(null);

  // Modals & UI States
  const [toasts, setToasts] = useState([]);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSeverity, setOverrideSeverity] = useState('P0 - Critical');
  const [overrideAction, setOverrideAction] = useState('reject');
  const [copiedFix, setCopiedFix] = useState(false);
  const [expandedArgs, setExpandedArgs] = useState({});
  const [stepFilter, setStepFilter] = useState('ALL');

  // Terminal autoscroll reference
  const terminalBottomRef = useRef(null);
  const agentEventSourceRef = useRef(null);
  const telemetryEventSourceRef = useRef(null);

  // Toast Notifications
  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initial Load & Backend Health Check
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setIsDbConnected(data.is_mongodb_connected))
      .catch(() => setIsDbConnected(false));

    fetchIncidents();
    const incidentInterval = setInterval(fetchIncidents, 2500);
    return () => clearInterval(incidentInterval);
  }, []);

  // 2. Real-time Telemetry Stream via SSE with Heartbeat Fallback
  useEffect(() => {
    let lastReceived = Date.now();

    const applyTelemetryPoint = (data) => {
      if (!data) return;
      lastReceived = Date.now();
      setTelemetry(data);
      setTelemetryHistory((prev) => {
        const next = [...prev, { ...data, time: new Date().toLocaleTimeString() }];
        return next.slice(-25);
      });
      if (data.active_incident_id && data.is_critical) {
        setSelectedTicketId((curr) => curr || data.active_incident_id);
      }
    };

    // Initial fetch via REST API for instant data load
    fetch('/api/telemetry')
      .then((res) => res.json())
      .then((data) => applyTelemetryPoint(data))
      .catch(() => {});

    const sse = new EventSource('/api/stream/telemetry');
    telemetryEventSourceRef.current = sse;

    const handleTelemetry = (raw) => {
      try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        applyTelemetryPoint(data);
      } catch (e) {
        console.error('Failed to parse telemetry event', e);
      }
    };

    sse.onmessage = (event) => handleTelemetry(event.data);
    sse.addEventListener('telemetry', (event) => handleTelemetry(event.data));

    sse.onerror = () => {
      console.warn('Telemetry SSE disconnected. Polling fallback...');
    };

    // Continuous 1-second fallback check to guarantee uninterrupted live telemetry
    const fallbackInterval = setInterval(() => {
      if (Date.now() - lastReceived >= 1500) {
        fetch('/api/telemetry')
          .then((res) => res.json())
          .then((data) => applyTelemetryPoint(data))
          .catch(() => {});
      }
    }, 1000);

    return () => {
      sse.close();
      clearInterval(fallbackInterval);
    };
  }, []);

  // 3. Connect to Agent Event Stream when active incident changes
  useEffect(() => {
    if (!selectedTicketId) return;

    if (agentEventSourceRef.current) {
      agentEventSourceRef.current.close();
    }

    setAgentSteps([]);

    const normalizeStep = (s, idx) => {
      const num = s.step_number || s.step_index || idx + 1;
      const rawType = (s.step_type || s.type || 'THOUGHT').toUpperCase();
      const txt = s.content || s.thought || s.observation || s.conclusion || '';
      return {
        ...s,
        step_number: num,
        step_index: num,
        step_type: rawType,
        type: rawType,
        thought: s.thought || (rawType === 'THOUGHT' || rawType === 'CONCLUSION' ? txt : null),
        observation: s.observation || (rawType === 'OBSERVATION' ? txt : null),
        content: txt
      };
    };

    // Pre-fetch past steps for this incident immediately via REST API
    fetch(`/api/agent/${selectedTicketId}/steps`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.steps || (Array.isArray(data) ? data : []);
        if (Array.isArray(list) && list.length > 0) {
          setAgentSteps(list.map((st, i) => normalizeStep(st, i)));
        }
      })
      .catch(() => {});

    const sse = new EventSource(`/api/stream/agent/${selectedTicketId}`);
    agentEventSourceRef.current = sse;

    setIsInvestigating(true);

    const handleStep = (raw) => {
      try {
        const step = JSON.parse(raw);

        if (step.step_type === 'SYSTEM_PING' || step.step_type === 'PING') {
          return;
        }

        const normalized = normalizeStep(step, 0);

        setAgentSteps((prev) => {
          const exists = prev.some(
            (s) => s.step_number === normalized.step_number && s.step_type === normalized.step_type
          );
          if (exists) return prev;
          return [...prev, normalized];
        });

        if (normalized.step_type === 'CONCLUSION' || (normalized.tool_name === 'create_incident_ticket' && (normalized.observation || normalized.content))) {
          setIsInvestigating(false);
          fetchIncidents();
        }
      } catch (err) {
        console.error('Failed to parse agent step:', err);
      }
    };

    sse.onmessage = (event) => handleStep(event.data);
    sse.addEventListener('agent_step', (event) => handleStep(event.data));

    sse.onerror = () => {
      setIsInvestigating(false);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [selectedTicketId]);

  // Smooth scroll for agent terminal
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentSteps]);

  // Fetch Raw Data Drawer content
  useEffect(() => {
    fetchRawData(rawTab);
  }, [rawTab]);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.incidents || []);
      setIncidents(list);

      if (list && list.length > 0) {
        if (!selectedTicketId || !list.some((i) => i.ticket_id === selectedTicketId)) {
          setSelectedTicketId(list[0].ticket_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    }
  };

  const fetchRawData = async (collection) => {
    setRawLoading(true);
    try {
      const res = await fetch(`/api/data/raw/${collection}`);
      const json = await res.json();
      setRawData(json.data || []);
    } catch {
      setRawData([]);
    } finally {
      setRawLoading(false);
    }
  };

  // Chaos Injection Trigger
  const handleTriggerChaos = async (scenarioNumber) => {
    setIsTriggering(true);
    setAgentSteps([]);
    const scenarioKey = typeof scenarioNumber === 'string' && scenarioNumber.startsWith('scenario_')
      ? scenarioNumber
      : `scenario_${scenarioNumber}`;
    try {
      const res = await fetch('/api/chaos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioKey })
      });
      const data = await res.json();

      if (res.ok) {
        const activeId = data.ticket_id || data.incident_id;
        addToast(
          `Scenario ${scenarioNumber} Injected`,
          `Agent ${activeId} activated and reasoning on telemetry.`,
          'warning'
        );
        if (activeId) {
          setSelectedTicketId(activeId);
        }
        fetchIncidents();
      } else {
        addToast('Trigger Failed', data.detail || 'Could not inject chaos.', 'error');
      }
    } catch (err) {
      addToast('Network Error', err.message, 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  // Approve & Execute Remediation Fix (HITL)
  const handleApproveFix = async () => {
    if (!selectedTicketId) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/incidents/${selectedTicketId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'oncall-sre@pulseops.internal' })
      });
      const data = await res.json();

      if (res.ok) {
        addToast(
          'Remediation Executed & Verified',
          `Incident ${selectedTicketId} resolved. MTTR: ${data.mttr_seconds || 14.2}s. Topology restored to healthy.`,
          'success'
        );
        fetchIncidents();
        fetchRawData(rawTab);
      } else {
        addToast('Approval Failed', data.detail || 'Could not execute fix.', 'error');
      }
    } catch (err) {
      addToast('Approval Error', err.message, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // Manual Override Submission
  const handleManualOverride = async () => {
    if (!selectedTicketId) return;
    try {
      const res = await fetch(`/api/incidents/${selectedTicketId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: overrideAction,
          notes: overrideNotes || 'Operator performed manual mitigation and closed ticket.',
          severity: overrideSeverity,
          operator: 'sre-lead@pulseops.internal'
        })
      });
      const data = await res.json();

      if (res.ok) {
        addToast('Override Applied', `Incident ${selectedTicketId} updated manually.`, 'info');
        setIsOverrideModalOpen(false);
        setOverrideNotes('');
        fetchIncidents();
      } else {
        addToast('Override Failed', data.detail || 'Error applying override.', 'error');
      }
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  // Reset Environment
  const handleReset = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        addToast('System Reset', 'All clusters, logs, and telemetry restored to healthy state.', 'info');
        setSelectedTicketId(null);
        setAgentSteps([]);
        fetchIncidents();
        fetchRawData(rawTab);
      }
    } catch (err) {
      addToast('Reset Failed', err.message, 'error');
    }
  };

  // Export Post-Mortem
  const handleExportPostMortem = async () => {
    if (!selectedTicketId) return;
    try {
      const res = await fetch(`/api/incidents/${selectedTicketId}/post-mortem`);
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Post-Mortem-${selectedTicketId}.md`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Post-Mortem Exported', `Downloaded Post-Mortem-${selectedTicketId}.md`, 'success');
      } else {
        addToast('Export Failed', 'Post-mortem not available for this incident.', 'error');
      }
    } catch (err) {
      addToast('Export Error', err.message, 'error');
    }
  };

  const selectedTicket = incidents.find((i) => i.ticket_id === selectedTicketId) || incidents[0] || null;

  // Determine Topology Health
  const scenarioStr = (telemetry?.active_scenario || '').toLowerCase();
  const isHealthy = (telemetry?.status === 'HEALTHY' || !telemetry?.is_critical) && !telemetry?.active_scenario && (telemetry?.error_rate_pct ?? 0) < 1;
  const isS1 = scenarioStr.includes('scenario_1') || scenarioStr.includes('connection_pool') || scenarioStr.includes('500');
  const isS2 = scenarioStr.includes('scenario_2') || scenarioStr.includes('memory_leak') || scenarioStr.includes('503');
  const isS3 = scenarioStr.includes('scenario_3') || scenarioStr.includes('ssl_expiry') || scenarioStr.includes('504');

  const topologyNodes = [
    {
      id: 'web-portal',
      name: 'Apex Web Portal',
      type: 'Ingress Client',
      latency: `${Math.round(telemetry.latency_ms * 0.15)}ms`,
      status: !isHealthy ? 'WARN' : 'HEALTHY',
      icon: Globe
    },
    {
      id: 'api-gateway',
      name: 'Envoy API Gateway',
      type: 'Edge Ingress',
      latency: `${Math.round(telemetry.latency_ms * 0.35)}ms`,
      status: isS3 ? 'CRITICAL' : !isHealthy ? 'WARN' : 'HEALTHY',
      icon: Layers
    },
    {
      id: 'auth-service',
      name: 'auth-service (Go)',
      type: 'Microservice',
      latency: `${Math.round(telemetry.latency_ms * 0.85)}ms`,
      status: isS2 ? 'CRITICAL' : 'HEALTHY',
      icon: KeyRound
    },
    {
      id: 'mongo-cluster',
      name: 'MongoDB Primary',
      type: 'Cluster Replica',
      latency: `${Math.round(telemetry.latency_ms)}ms`,
      status: isS1 ? 'CRITICAL' : 'HEALTHY',
      icon: Database
    },
    {
      id: 'redis-cache',
      name: 'Redis State Cache',
      type: 'Memory Tier',
      latency: '2.4ms',
      status: 'HEALTHY',
      icon: Server
    }
  ];

  const filteredSteps = agentSteps.filter((s) => {
    if (stepFilter === 'ALL') return true;
    return s.step_type === stepFilter;
  });

  const filteredRawData = rawData.filter((item) => {
    if (!rawSearch) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(rawSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#EDE7DC] text-[#0A1326] flex flex-col selection:bg-[#0A1326] selection:text-[#EDE7DC]">
      {/* Toast Stack */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl neu-flat flex items-start gap-3 border-l-4 transition-all ${
              t.type === 'error'
                ? 'border-[#B91C1C]'
                : t.type === 'warning'
                ? 'border-[#D97706]'
                : t.type === 'success'
                ? 'border-[#047857]'
                : 'border-[#0A1326]'
            }`}
          >
            <div className="flex-1">
              <h5 className="font-extrabold text-xs tracking-tight text-[#0A1326]">{t.title}</h5>
              <p className="text-xs font-medium text-[#4A5568] mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#718096] hover:text-[#0A1326] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Command & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#EDE7DC]/95 backdrop-blur-md border-b border-[#D4CBBE]/60 px-6 py-4">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Operational Status */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl neu-flat flex items-center justify-center font-extrabold text-2xl text-[#0A1326]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-3xl tracking-tighter text-[#0A1326] leading-none">
                  PULSEOPS
                </span>
                <span
                  className={`px-3 py-1 rounded-xl text-[10px] font-extrabold tracking-wider uppercase ${
                    isHealthy
                      ? 'neu-btn-success text-white'
                      : 'neu-btn-danger text-white animate-pulse'
                  }`}
                >
                  {isHealthy ? '● SYSTEM HEALTHY' : '▲ OUTAGE DETECTED'}
                </span>
              </div>
              <span className="text-[11px] font-bold tracking-widest text-[#5E687A] uppercase mt-0.5 block">
                Autonomous SRE On-Call Investigation Engine • ReAct Loop
              </span>
            </div>
          </div>

          {/* MTTD / MTTR Modernist Metrics Counters */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="px-5 py-2.5 rounded-2xl neu-inset flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#5E687A] uppercase tracking-wider block">
                  MTTD (Mean Time to Detect)
                </span>
                <span className="font-extrabold text-xl text-[#0A1326] tracking-tight leading-none">
                  1.2s
                </span>
              </div>
              <Clock className="w-4 h-4 text-[#0A1326]" />
            </div>

            <div className="px-5 py-2.5 rounded-2xl neu-inset flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#5E687A] uppercase tracking-wider block">
                  MTTR (Mean Time to Resolve)
                </span>
                <span className="font-extrabold text-xl text-[#047857] tracking-tight leading-none">
                  14.5s
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#047857]" />
            </div>
          </div>

          {/* Preset Chaos Injector & Navigation to Storefront */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl neu-inset">
              <span className="text-[11px] font-extrabold text-[#0A1326] px-2.5 uppercase tracking-wider">
                INJECT FAULT:
              </span>
              <button
                disabled={isTriggering}
                onClick={() => handleTriggerChaos(1)}
                className="px-3 py-1.5 rounded-xl neu-btn text-xs font-bold text-[#0A1326] hover:text-[#B91C1C]"
                title="Scenario 1: HTTP 500 Connection Pool Exhausted"
              >
                S1: 500 DB Pool
              </button>
              <button
                disabled={isTriggering}
                onClick={() => handleTriggerChaos(2)}
                className="px-3 py-1.5 rounded-xl neu-btn text-xs font-bold text-[#0A1326] hover:text-[#B91C1C]"
                title="Scenario 2: HTTP 503 Auth Service Memory Leak"
              >
                S2: 503 Auth Leak
              </button>
              <button
                disabled={isTriggering}
                onClick={() => handleTriggerChaos(3)}
                className="px-3 py-1.5 rounded-xl neu-btn text-xs font-bold text-[#0A1326] hover:text-[#B91C1C]"
                title="Scenario 3: HTTP 504 SSL Expiry & Gateway Timeout"
              >
                S3: 504 SSL Timeout
              </button>
            </div>

            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl neu-btn text-[#0A1326]"
              title="Reset System & Clear Faults"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Direct Switcher to Storefront */}
            <button
              onClick={onNavigateToStore}
              className="px-4 py-2.5 rounded-2xl neu-btn-navy text-xs font-extrabold tracking-tight flex items-center gap-2"
              title="Navigate to Apex Hardware Customer Storefront"
            >
              <ShoppingCart className="w-4 h-4 text-[#EDE7DC]" />
              <span>Customer Storefront</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main SRE Control Center Grid */}
      <main className="max-w-[1720px] mx-auto p-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN: Service Topology Mesh & Telemetry Charts (3 Cols) */}
        {/* ============================================================== */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          {/* Topology Mesh Panel */}
          <div className="neu-flat rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg tracking-tight text-[#0A1326] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0A1326]" />
                Topology Mesh
              </h3>
              <span className="text-[10px] font-bold text-[#5E687A] uppercase tracking-wider">
                5 Active Pods
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {topologyNodes.map((node) => {
                const IconComponent = node.icon;
                const isCrit = node.status === 'CRITICAL';
                const isWarn = node.status === 'WARN';

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3.5 rounded-2xl neu-flat-sm cursor-pointer transition-all flex items-center justify-between border-l-4 ${
                      isCrit
                        ? 'border-[#B91C1C] bg-[#B91C1C]/5'
                        : isWarn
                        ? 'border-[#D97706]'
                        : 'border-[#047857]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl neu-inset flex items-center justify-center ${
                          isCrit ? 'text-[#B91C1C]' : 'text-[#0A1326]'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#0A1326] block leading-tight">
                          {node.name}
                        </span>
                        <span className="text-[10px] text-[#5E687A] font-semibold">
                          {node.type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-extrabold tracking-wider block ${
                          isCrit
                            ? 'text-[#B91C1C]'
                            : isWarn
                            ? 'text-[#D97706]'
                            : 'text-[#047857]'
                        }`}
                      >
                        {node.status}
                      </span>
                      <span className="text-[10px] font-bold text-[#5E687A]">
                        {node.latency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Telemetry Sparklines */}
          <div className="neu-flat rounded-3xl p-6 flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg tracking-tight text-[#0A1326] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0A1326]" />
                Live Telemetry
              </h3>
              <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#047857] animate-ping" />
                1Hz Stream
              </span>
            </div>

            {/* Sparkline 1: CPU & RAM Load */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#5E687A]">Cluster CPU Load</span>
                <span
                  className={`font-extrabold text-base ${
                    (telemetry?.cpu_usage ?? 0) > 90 ? 'text-[#B91C1C]' : 'text-[#0A1326]'
                  }`}
                >
                  {(telemetry?.cpu_usage ?? 24.5).toFixed(1)}%
                </span>
              </div>
              <div className="h-16 rounded-xl neu-inset p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory}>
                    <YAxis domain={[0, 100]} hide />
                    <Area
                      type="monotone"
                      dataKey="cpu_usage"
                      stroke="#0A1326"
                      strokeWidth={2}
                      fill="#0A1326"
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sparkline 2: HTTP 5xx Error Rate */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#5E687A]">HTTP 5xx Error Rate</span>
                <span
                  className={`font-extrabold text-base ${
                    (telemetry?.error_rate_pct ?? 0) > 1 ? 'text-[#B91C1C]' : 'text-[#047857]'
                  }`}
                >
                  {(telemetry?.error_rate_pct ?? 0.02).toFixed(2)}%
                </span>
              </div>
              <div className="h-16 rounded-xl neu-inset p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory}>
                    <YAxis domain={[0, 100]} hide />
                    <Area
                      type="monotone"
                      dataKey="error_rate_pct"
                      stroke={(telemetry?.error_rate_pct ?? 0) > 1 ? '#B91C1C' : '#047857'}
                      strokeWidth={2}
                      fill={(telemetry?.error_rate_pct ?? 0) > 1 ? '#B91C1C' : '#047857'}
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sparkline 3: Latency */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#5E687A]">P99 Request Latency</span>
                <span
                  className={`font-extrabold text-base ${
                    (telemetry?.latency_ms ?? 0) > 200 ? 'text-[#B91C1C]' : 'text-[#0A1326]'
                  }`}
                >
                  {Math.round(telemetry?.latency_ms ?? 38)} ms
                </span>
              </div>
              <div className="h-16 rounded-xl neu-inset p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory}>
                    <YAxis domain={[0, 1000]} hide />
                    <Area
                      type="monotone"
                      dataKey="latency_ms"
                      stroke="#0A1326"
                      strokeWidth={2}
                      fill="#0A1326"
                      fillOpacity={0.12}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: Autonomous AI ReAct Stepper & Raw Data Drawer (5 Cols)   */}
        {/* ========================================================================= */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Top Half: ReAct Agent Stepper */}
          <div className="neu-flat rounded-3xl p-6 flex flex-col gap-4 min-h-[460px] max-h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CBBE]">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-[#0A1326]" />
                <h3 className="font-extrabold text-xl tracking-tight text-[#0A1326]">
                  ReAct Reasoning Loop
                </h3>
                {isInvestigating && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0A1326] text-white text-[10px] font-extrabold tracking-wider uppercase animate-pulse">
                    Agent Thinking...
                  </span>
                )}
              </div>

              {/* Step Type Filters */}
              <div className="flex items-center gap-1.5">
                {['ALL', 'THOUGHT', 'TOOL_CALL', 'OBSERVATION'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStepFilter(f)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold tracking-tight transition-all ${
                      stepFilter === f ? 'neu-btn-navy' : 'neu-btn text-[#0A1326]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Content Window */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3.5 scrollbar-thin">
              {filteredSteps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3 my-auto">
                  <div className="w-12 h-12 rounded-full neu-inset flex items-center justify-center text-[#5E687A]">
                    <Brain className="w-6 h-6" />
                  </div>
                  <span className="font-extrabold text-base text-[#0A1326]">
                    Autonomous Agent Ready
                  </span>
                  <p className="text-xs text-[#5E687A] max-w-sm">
                    Inject a chaos scenario from the top bar or send a synthetic alert to trigger the multi-step ReAct investigation loop.
                  </p>
                </div>
              ) : (
                filteredSteps.map((step, idx) => {
                  const isThought = step.step_type === 'THOUGHT';
                  const isTool = step.step_type === 'TOOL_CALL';
                  const isObs = step.step_type === 'OBSERVATION';
                  const isConclusion = step.step_type === 'CONCLUSION';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl neu-flat-sm flex flex-col gap-2 border-l-4 ${
                        isThought
                          ? 'border-[#0284C7]'
                          : isTool
                          ? 'border-[#7C3AED]'
                          : isObs
                          ? 'border-[#059669]'
                          : 'border-[#D97706]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase ${
                              isThought
                                ? 'bg-[#0284C7]/15 text-[#0284C7]'
                                : isTool
                                ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                                : isObs
                                ? 'bg-[#059669]/15 text-[#059669]'
                                : 'bg-[#D97706]/15 text-[#D97706]'
                            }`}
                          >
                            {step.step_type}
                          </span>
                          {step.tool_name && (
                            <span className="font-extrabold text-xs text-[#0A1326]">
                              {step.tool_name}()
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-[#5E687A]">
                          Step #{step.step_number || idx + 1}
                        </span>
                      </div>

                      {/* Content */}
                      {(step.thought || (!step.observation && step.content)) && (
                        <p className={`text-xs font-semibold text-[#0A1326] leading-relaxed ${isThought ? 'italic' : ''}`}>
                          {isThought ? `"${step.thought || step.content}"` : (step.thought || step.content)}
                        </p>
                      )}

                      {step.tool_args && (
                        <pre className="text-[11px] p-2.5 rounded-xl neu-inset text-[#0A1326] overflow-x-auto">
                          {JSON.stringify(step.tool_args, null, 2)}
                        </pre>
                      )}

                      {step.observation && (
                        <pre className="text-[11px] p-2.5 rounded-xl neu-inset text-[#0A1326] overflow-x-auto max-h-40 whitespace-pre-wrap">
                          {typeof step.observation === 'object'
                            ? JSON.stringify(step.observation, null, 2)
                            : step.observation}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={terminalBottomRef} />
            </div>
          </div>

          {/* Bottom Half: Raw MongoDB Data Drawer */}
          <div className="neu-flat rounded-3xl p-6 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CBBE]">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[#0A1326]" />
                <h3 className="font-extrabold text-xl tracking-tight text-[#0A1326]">
                  Evidence Storage
                </h3>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'server_logs', label: 'Logs' },
                  { id: 'deployments', label: 'Deploys' },
                  { id: 'service_traces', label: 'Traces' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRawTab(t.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      rawTab === t.id ? 'neu-btn-navy' : 'neu-btn text-[#0A1326]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5E687A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${rawTab}...`}
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl neu-inset text-xs font-semibold text-[#0A1326] outline-none"
              />
            </div>

            {/* Data Stream Box */}
            <div className="flex-1 overflow-y-auto max-h-60 rounded-2xl neu-inset p-3 text-xs font-mono text-[#0A1326] space-y-2">
              {rawLoading ? (
                <div className="text-center py-6 text-[#5E687A]">Querying MongoDB collection...</div>
              ) : filteredRawData.length === 0 ? (
                <div className="text-center py-6 text-[#5E687A]">No evidence records found.</div>
              ) : (
                filteredRawData.map((record, i) => (
                  <div key={i} className="p-2 rounded-lg bg-[#EDE7DC]/70 border border-[#D4CBBE]/50">
                    <pre className="overflow-x-auto">{JSON.stringify(record, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: RCA Incident Ticket & Mandatory HITL Approval Gate (4 Cols) */}
        {/* ========================================================================= */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="neu-flat rounded-3xl p-7 flex flex-col justify-between gap-6 flex-1">
            <div className="flex flex-col gap-5">
              {/* Ticket Top Badges & ID */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D4CBBE]">
                <div>
                  <span className="text-[10px] font-bold text-[#5E687A] uppercase tracking-wider block">
                    ACTIVE INCIDENT TICKET
                  </span>
                  <h3 className="font-extrabold text-2xl tracking-tighter text-[#0A1326]">
                    {selectedTicket ? selectedTicket.ticket_id : 'NO ACTIVE TICKET'}
                  </h3>
                </div>

                {selectedTicket && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold tracking-tight ${
                        selectedTicket.severity?.includes('P0')
                          ? 'neu-btn-danger text-white'
                          : 'neu-btn text-[#0A1326]'
                      }`}
                    >
                      {selectedTicket.severity || 'P0 - Critical'}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold tracking-tight ${
                        selectedTicket.status === 'RESOLVED'
                          ? 'neu-btn-success text-white'
                          : 'neu-btn-navy text-[#EDE7DC]'
                      }`}
                    >
                      {selectedTicket.status || 'INVESTIGATING'}
                    </span>
                  </div>
                )}
              </div>

              {selectedTicket ? (
                <>
                  {/* Title & Confidence Score */}
                  <div className="flex flex-col gap-2">
                    <h4 className="font-extrabold text-lg tracking-tight text-[#0A1326] leading-snug">
                      {selectedTicket.title}
                    </h4>

                    {/* AI Confidence Meter */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-[#5E687A]">AI RCA Confidence</span>
                      <span className="font-extrabold text-[#0A1326]">
                        {typeof selectedTicket.confidence_score === 'number'
                          ? (selectedTicket.confidence_score <= 1 ? Math.round(selectedTicket.confidence_score * 100) : selectedTicket.confidence_score)
                          : 98}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full neu-inset overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-[#0A1326]"
                        style={{
                          width: `${
                            typeof selectedTicket.confidence_score === 'number'
                              ? (selectedTicket.confidence_score <= 1 ? Math.round(selectedTicket.confidence_score * 100) : selectedTicket.confidence_score)
                              : 98
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Root Cause Analysis (RCA) Statement */}
                  <div className="p-4 rounded-2xl neu-inset flex flex-col gap-1.5">
                    <span className="text-[10px] font-extrabold text-[#5E687A] uppercase tracking-wider">
                      Root Cause Synthesis
                    </span>
                    <p className="text-xs font-semibold text-[#0A1326] leading-relaxed">
                      {selectedTicket.root_cause_summary || selectedTicket.root_cause || 'Agent formulating definitive root cause explanation...'}
                    </p>
                  </div>

                  {/* Cascading Failure Map */}
                  {selectedTicket.cascading_failure_map && (
                    <div className="p-3 rounded-2xl neu-flat-sm flex flex-col gap-1 border-l-4 border-[#D97706]">
                      <span className="text-[10px] font-extrabold text-[#D97706] uppercase tracking-wider">
                        Cascading Impact Map
                      </span>
                      <span className="text-xs font-bold text-[#0A1326]">
                        {selectedTicket.cascading_failure_map}
                      </span>
                    </div>
                  )}

                  {/* Proposed Remediation Fix */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#5E687A] uppercase tracking-wider">
                        Agent Proposed Automated Fix
                      </span>
                      {selectedTicket.proposed_fix && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTicket.proposed_fix);
                            setCopiedFix(true);
                            setTimeout(() => setCopiedFix(false), 2000);
                          }}
                          className="text-[11px] font-bold text-[#0A1326] flex items-center gap-1 hover:underline"
                        >
                          {copiedFix ? <Check className="w-3 h-3 text-[#047857]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedFix ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <div className="p-3.5 rounded-2xl neu-inset font-mono text-xs text-[#0A1326] leading-relaxed overflow-x-auto">
                      {selectedTicket.proposed_fix || 'Determining safe remediation command...'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full neu-inset flex items-center justify-center text-[#5E687A]">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <span className="font-extrabold text-lg text-[#0A1326]">No Incident Detected</span>
                  <span className="text-xs text-[#5E687A] max-w-xs">
                    All nodes operational. Trigger a chaos test to generate an autonomous RCA incident ticket.
                  </span>
                </div>
              )}
            </div>

            {/* MANDATORY HUMAN-IN-THE-LOOP (HITL) APPROVAL GATE */}
            {selectedTicket && selectedTicket.status !== 'RESOLVED' && (
              <div className="pt-5 border-t border-[#D4CBBE] flex flex-col gap-3.5">
                <div className="p-3.5 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/30 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />
                  <span className="text-xs font-bold text-[#92400E]">
                    Mandatory Safety Gate: SRE Approval required before executing production rollback.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isApproving}
                    onClick={handleApproveFix}
                    className="py-3.5 rounded-2xl neu-btn-success font-extrabold text-xs tracking-tight flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApproving ? (
                      <span>Executing Rollback...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Execute Fix</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsOverrideModalOpen(true)}
                    className="py-3.5 rounded-2xl neu-btn font-extrabold text-xs tracking-tight text-[#0A1326] flex items-center justify-center gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Manual Override</span>
                  </button>
                </div>
              </div>
            )}

            {/* Resolved State & Post-Mortem Export */}
            {selectedTicket && selectedTicket.status === 'RESOLVED' && (
              <div className="pt-5 border-t border-[#D4CBBE] flex flex-col gap-3">
                <div className="p-3.5 rounded-2xl bg-[#047857]/10 border border-[#047857]/30 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#047857]" />
                  <span className="text-xs font-bold text-[#065F46]">
                    Remediation Complete. Cluster healthy & telemetry normalized.
                  </span>
                </div>

                <button
                  onClick={handleExportPostMortem}
                  className="w-full py-3.5 rounded-2xl neu-btn-navy font-extrabold text-xs tracking-tight flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#EDE7DC]" />
                  <span>Download Publication Post-Mortem (.md)</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Manual Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1326]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#EDE7DC] rounded-3xl p-8 neu-flat-lg flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CBBE]">
              <h3 className="font-extrabold text-2xl tracking-tight text-[#0A1326]">
                Manual SRE Override
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-2 rounded-xl neu-btn text-[#0A1326]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-extrabold uppercase text-[#5E687A] block mb-1.5">
                  Action Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOverrideAction('reject')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold ${
                      overrideAction === 'reject' ? 'neu-btn-danger' : 'neu-btn text-[#0A1326]'
                    }`}
                  >
                    Reject Agent Action
                  </button>
                  <button
                    onClick={() => setOverrideAction('manual_resolve')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold ${
                      overrideAction === 'manual_resolve' ? 'neu-btn-navy' : 'neu-btn text-[#0A1326]'
                    }`}
                  >
                    Resolve with Notes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase text-[#5E687A] block mb-1.5">
                  Severity Reclassification
                </label>
                <select
                  value={overrideSeverity}
                  onChange={(e) => setOverrideSeverity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl neu-inset text-xs font-bold text-[#0A1326] outline-none"
                >
                  <option value="P0 - Critical">P0 - Critical</option>
                  <option value="P1 - High">P1 - High</option>
                  <option value="P2 - Medium">P2 - Medium</option>
                  <option value="P3 - Low">P3 - Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase text-[#5E687A] block mb-1.5">
                  Operator Triage Notes & Rational
                </label>
                <textarea
                  rows={4}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Detail why the agent recommendation was altered..."
                  className="w-full px-4 py-3 rounded-2xl neu-inset text-xs font-semibold text-[#0A1326] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl neu-btn text-xs font-bold text-[#0A1326]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualOverride}
                  className="px-6 py-2.5 rounded-xl neu-btn-navy text-xs font-extrabold text-[#EDE7DC]"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
