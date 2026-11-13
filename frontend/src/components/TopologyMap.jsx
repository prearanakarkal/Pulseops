import React, { useState } from 'react';
import { 
  Globe, 
  Server, 
  KeyRound, 
  CreditCard, 
  Database, 
  Layers, 
  AlertTriangle, 
  CheckCircle2,
  Info
} from 'lucide-react';

export default function TopologyMap({ activeScenario, telemetry }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Determine node states based on active fault scenario
  const getNodeState = (nodeId) => {
    if (!activeScenario) return { status: 'HEALTHY', latency: '12ms', errorRate: '0.0%' };

    if (activeScenario === 'scenario_1') {
      if (nodeId === 'mongodb' || nodeId === 'payment') {
        return { status: 'CRITICAL', latency: '30,000ms', errorRate: '48.2%', fault: 'Pool Exhaustion (500/500)' };
      }
      if (nodeId === 'gateway') {
        return { status: 'WARNING', latency: '30,020ms', errorRate: '48.2%', fault: 'Upstream 500' };
      }
    }

    if (activeScenario === 'scenario_2') {
      if (nodeId === 'auth') {
        return { status: 'CRITICAL', latency: '5,000ms', errorRate: '58.0%', fault: 'Memory Leak & CPU 98%' };
      }
      if (nodeId === 'gateway') {
        return { status: 'WARNING', latency: '5,010ms', errorRate: '58.0%', fault: '503 Service Unavailable' };
      }
    }

    if (activeScenario === 'scenario_3') {
      if (nodeId === 'gateway') {
        return { status: 'CRITICAL', latency: '15,000ms', errorRate: '72.0%', fault: 'SSL Handshake Terminated (504)' };
      }
    }

    return { status: 'HEALTHY', latency: '18ms', errorRate: '0.0%' };
  };

  const nodes = [
    { id: 'web', name: 'React Web', type: 'Client App', icon: Globe, x: 50, y: 35 },
    { id: 'gateway', name: 'API Gateway', type: 'Envoy Proxy', icon: Server, x: 50, y: 110 },
    { id: 'auth', name: 'Auth Service', type: 'Microservice', icon: KeyRound, x: 20, y: 200 },
    { id: 'payment', name: 'Payment Service', type: 'Microservice', icon: CreditCard, x: 80, y: 200 },
    { id: 'redis', name: 'Redis Cache', type: 'In-Memory', icon: Layers, x: 20, y: 285 },
    { id: 'mongodb', name: 'MongoDB Primary', type: 'Database Cluster', icon: Database, x: 80, y: 285 }
  ];

  const links = [
    { from: 'web', to: 'gateway' },
    { from: 'gateway', to: 'auth' },
    { from: 'gateway', to: 'payment' },
    { from: 'auth', to: 'redis' },
    { from: 'payment', to: 'mongodb' }
  ];

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            System Topology Mesh
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          6 Active Nodes
        </span>
      </div>

      {/* SVG Canvas for Dynamic Interactive Node Mesh */}
      <div className="relative w-full h-64 bg-slate-950/90 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 320" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="healthyLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="criticalLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Links between nodes */}
          {links.map((link, idx) => {
            const fromNode = nodes.find((n) => n.id === link.from);
            const toNode = nodes.find((n) => n.id === link.to);
            const fromState = getNodeState(fromNode.id);
            const toState = getNodeState(toNode.id);
            const isFailing = fromState.status === 'CRITICAL' || toState.status === 'CRITICAL';

            return (
              <g key={idx}>
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isFailing ? 'url(#criticalLine)' : 'url(#healthyLine)'}
                  strokeWidth={isFailing ? '2.5' : '1.5'}
                  strokeDasharray={isFailing ? '3 3' : 'none'}
                  className={isFailing ? 'animate-pulse' : ''}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const state = getNodeState(node.id);
            const isSelected = selectedNode?.id === node.id;
            const isCritical = state.status === 'CRITICAL';
            const isWarning = state.status === 'WARNING';

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode({ ...node, ...state })}
                className="cursor-pointer group"
              >
                {/* Node Outer Halo */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="13"
                  className={`transition-all duration-300 ${
                    isCritical
                      ? 'fill-rose-950/80 stroke-rose-500 animate-pulse stroke-2'
                      : isWarning
                      ? 'fill-amber-950/80 stroke-amber-500 stroke-2'
                      : isSelected
                      ? 'fill-cyan-950/90 stroke-cyan-400 stroke-2'
                      : 'fill-slate-900/90 stroke-slate-700 hover:stroke-cyan-500 stroke-1'
                  }`}
                />

                {/* Status Dot */}
                <circle
                  cx={node.x + 9}
                  cy={node.y - 9}
                  r="3.5"
                  className={
                    isCritical
                      ? 'fill-rose-500 shadow-[0_0_8px_#f43f5e]'
                      : isWarning
                      ? 'fill-amber-400'
                      : 'fill-emerald-400'
                  }
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 19}
                  textAnchor="middle"
                  className={`text-[8.5px] font-mono select-none font-semibold ${
                    isCritical
                      ? 'fill-rose-400'
                      : isWarning
                      ? 'fill-amber-300'
                      : isSelected
                      ? 'fill-cyan-300'
                      : 'fill-slate-300'
                  }`}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Overlay Node Inspector Tooltip */}
        {selectedNode && (
          <div className="absolute top-2 left-2 right-2 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-200">{selectedNode.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  selectedNode.status === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {selectedNode.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono mt-1.5">
              <div>Type: <span className="text-slate-200">{selectedNode.type}</span></div>
              <div>Latency: <span className="text-slate-200">{selectedNode.latency}</span></div>
              <div>Error Rate: <span className="text-slate-200">{selectedNode.errorRate}</span></div>
              {selectedNode.fault && (
                <div className="col-span-2 text-rose-400 font-semibold">
                  Fault: {selectedNode.fault}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Warning
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Critical
        </span>
      </div>
    </div>
  );
}
