import React from 'react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Cpu, Zap, AlertCircle, Database } from 'lucide-react';

export default function TelemetryCharts({ telemetryHistory, currentPoint }) {
  const data = telemetryHistory.slice(-20); // Keep last 20 data points

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Live Telemetry Stream
        </h2>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
          SSE 1Hz
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Metric 1: CPU Load */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              <Cpu className="w-3 h-3 text-cyan-400" /> CPU Load
            </span>
            <span
              className={`font-mono font-bold ${
                (currentPoint?.cpu_usage || 0) > 85 ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {currentPoint?.cpu_usage || 0}%
            </span>
          </div>
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area
                  type="monotone"
                  dataKey="cpu_usage"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  fill="url(#cpuGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric 2: Request Latency */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              <Zap className="w-3 h-3 text-amber-400" /> Latency
            </span>
            <span
              className={`font-mono font-bold ${
                (currentPoint?.latency_ms || 0) > 500 ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              {currentPoint?.latency_ms || 0}ms
            </span>
          </div>
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="latency_ms"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  fill="url(#latGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric 3: Error Rate % */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              <AlertCircle className="w-3 h-3 text-rose-400" /> 5xx Rate
            </span>
            <span
              className={`font-mono font-bold ${
                (currentPoint?.error_rate_pct || 0) > 5 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {currentPoint?.error_rate_pct || 0}%
            </span>
          </div>
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area
                  type="monotone"
                  dataKey="error_rate_pct"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  fill="url(#errGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric 4: DB Active Conns */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              <Database className="w-3 h-3 text-purple-400" /> DB Conns
            </span>
            <span
              className={`font-mono font-bold ${
                (currentPoint?.active_connections || 0) >= 500 ? 'text-rose-400' : 'text-purple-300'
              }`}
            >
              {currentPoint?.active_connections || 0}/500
            </span>
          </div>
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <YAxis domain={[0, 500]} hide />
                <Line
                  type="monotone"
                  dataKey="active_connections"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
