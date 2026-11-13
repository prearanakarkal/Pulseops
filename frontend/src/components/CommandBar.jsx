import React from 'react';
import { 
  Activity, 
  Flame, 
  RefreshCw, 
  Send, 
  Bell, 
  Database, 
  ShieldAlert, 
  Clock, 
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

export default function CommandBar({
  systemStatus,
  activeScenario,
  mttd,
  mttr,
  isDbConnected,
  isTriggering,
  onTriggerChaos,
  onResetSystem,
  onOpenCustomAlert,
  onOpenWebhookModal
}) {
  const isHealthy = systemStatus === 'HEALTHY';

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-5 py-3 sticky top-0 z-40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Health Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-md shadow-cyan-900/40">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                  PULSE<span className="text-white">OPS</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  v2.4 SRE
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Autonomous Incident Responder</div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* System Health Banner */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
              isHealthy
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-900/20'
                : 'bg-rose-950/60 text-rose-300 border-rose-700/80 shadow-md shadow-rose-900/30 animate-pulse'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isHealthy
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : 'bg-rose-500 shadow-[0_0_10px_#ef4444]'
              }`}
            />
            <span className="font-mono tracking-wide font-semibold">
              {isHealthy ? 'SYSTEM HEALTHY' : `CRITICAL OUTAGE: ${activeScenario?.toUpperCase() || 'FAULT ACTIVE'}`}
            </span>
          </div>

          {/* DB Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/70 border border-slate-700/50 text-[11px] font-mono text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>DB: {isDbConnected ? 'MongoDB Live' : 'In-Memory Store'}</span>
          </div>
        </div>

        {/* Center: MTTD / MTTR Metrics */}
        <div className="hidden md:flex items-center gap-5 px-3 py-1 bg-slate-950/70 rounded-lg border border-slate-800/80 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">MTTD:</span>
            <span className="text-amber-300 font-bold">{mttd ? `${mttd}s` : '--'}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">MTTR:</span>
            <span className="text-emerald-300 font-bold">{mttr ? `${mttr}s` : '--'}</span>
          </div>
        </div>

        {/* Right: Chaos Scenarios & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono uppercase text-slate-400 px-2 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500" /> Chaos:
            </span>
            <button
              disabled={isTriggering}
              onClick={() => onTriggerChaos('scenario_1')}
              title="Scenario 1: MongoDB Connection Pool Exhausted (HTTP 500)"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 hover:border-rose-600 transition-all disabled:opacity-50"
            >
              S1: Pool 500
            </button>
            <button
              disabled={isTriggering}
              onClick={() => onTriggerChaos('scenario_2')}
              title="Scenario 2: Auth Memory Leak & CPU Spike 98% (HTTP 503)"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 hover:border-amber-600 transition-all disabled:opacity-50"
            >
              S2: Memory 503
            </button>
            <button
              disabled={isTriggering}
              onClick={() => onTriggerChaos('scenario_3')}
              title="Scenario 3: Expired SSL & Gateway Timeout (HTTP 504)"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 hover:border-purple-600 transition-all disabled:opacity-50"
            >
              S3: SSL 504
            </button>
          </div>

          <button
            onClick={onOpenCustomAlert}
            title="Send Custom Synthetic Alert Webhook"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Alert Hook</span>
          </button>

          <button
            onClick={onOpenWebhookModal}
            title="Configure Slack / Discord Webhook Notifications"
            className="p-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <Bell className="w-4 h-4 text-slate-400 hover:text-amber-400" />
          </button>

          <button
            onClick={onResetSystem}
            title="Reset system to healthy baseline"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
