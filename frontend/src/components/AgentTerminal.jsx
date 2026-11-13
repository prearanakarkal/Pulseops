import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Brain, 
  Wrench, 
  Eye, 
  CheckCircle, 
  Zap, 
  ChevronDown, 
  ChevronRight,
  Filter,
  Copy,
  Check
} from 'lucide-react';

export default function AgentTerminal({ steps, isInvestigating, incidentId }) {
  const [filterType, setFilterType] = useState('ALL');
  const [expandedArgs, setExpandedArgs] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const terminalEndRef = useRef(null);

  // Auto-scroll to bottom as new steps arrive
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const toggleExpand = (idx) => {
    setExpandedArgs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const filteredSteps = steps.filter((step) => {
    if (filterType === 'ALL') return true;
    return step.type.toLowerCase() === filterType.toLowerCase();
  });

  const getBadge = (type) => {
    switch (type.toLowerCase()) {
      case 'thought':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-sm shadow-purple-950">
            <Brain className="w-3 h-3 text-purple-400" /> THOUGHT
          </span>
        );
      case 'tool_call':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-950">
            <Wrench className="w-3 h-3 text-cyan-400" /> TOOL CALL
          </span>
        );
      case 'observation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm shadow-emerald-950">
            <Eye className="w-3 h-3 text-emerald-400" /> OBSERVATION
          </span>
        );
      case 'conclusion':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm shadow-amber-950">
            <CheckCircle className="w-3 h-3 text-amber-400" /> CONCLUSION
          </span>
        );
      case 'remediation_complete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500 shadow-sm shadow-emerald-950">
            <Zap className="w-3 h-3 text-emerald-400" /> REMEDIATION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300">
            {type.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl flex flex-col flex-1 overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 ml-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            AGENT RE-ACT TRACE BUFFER
          </span>
          {incidentId && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              {incidentId}
            </span>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <Filter className="w-3 h-3 text-slate-400 mr-1" />
          {['ALL', 'THOUGHT', 'TOOL_CALL', 'OBSERVATION'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterType === tab
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs leading-relaxed max-h-[440px] select-text">
        {filteredSteps.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2 font-mono">
            <Brain className="w-8 h-8 opacity-30 animate-pulse text-cyan-400" />
            <span>Awaiting incident alert or chaos trigger...</span>
            <span className="text-[11px] opacity-70">
              Click any Scenario button in the Command Bar to start investigation.
            </span>
          </div>
        ) : (
          filteredSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all animate-in fade-in duration-200 ${
                step.type === 'thought'
                  ? 'bg-purple-950/20 border-purple-900/40 text-purple-100'
                  : step.type === 'tool_call'
                  ? 'bg-cyan-950/20 border-cyan-900/40 text-cyan-100'
                  : step.type === 'observation'
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100'
                  : step.type === 'conclusion'
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-100'
                  : 'bg-emerald-900/30 border-emerald-600/70 text-emerald-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 opacity-80">#{step.step_index || idx + 1}</span>
                  {getBadge(step.type)}
                  {step.tool_name && (
                    <span className="text-cyan-300 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                      {step.tool_name}()
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 opacity-60">
                    {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ''}
                  </span>
                  <button
                    onClick={() => handleCopy(step.content, idx)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                    title="Copy step content"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step Content */}
              <div className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed pl-1">
                {step.content}
              </div>

              {/* Expandable Tool Args */}
              {step.tool_args && Object.keys(step.tool_args).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {expandedArgs[idx] ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Payload Arguments</span>
                  </button>
                  {expandedArgs[idx] && (
                    <pre className="mt-1 p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-cyan-200 overflow-x-auto">
                      {JSON.stringify(step.tool_args, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Live typing pulse indicator */}
        {isInvestigating && (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs p-2 rounded bg-cyan-950/30 border border-cyan-800/40 animate-pulse">
            <Brain className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Agent reasoning and querying diagnostic tools...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
