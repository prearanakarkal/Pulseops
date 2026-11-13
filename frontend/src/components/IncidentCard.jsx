import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Clock, 
  FileText, 
  GitFork, 
  Activity, 
  ListChecks,
  AlertOctagon,
  CheckCircle
} from 'lucide-react';

export default function IncidentCard({
  ticket,
  allIncidents,
  onSelectTicket,
  onApproveFix,
  onOpenOverrideModal,
  onExportPostMortem,
  onViewPostMortem,
  isApproving
}) {
  const [copiedFix, setCopiedFix] = useState(false);

  if (!ticket) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col items-center justify-center text-center text-slate-500 gap-3 min-h-[400px]">
        <ShieldAlert className="w-12 h-12 opacity-30 text-cyan-400 animate-pulse" />
        <div className="font-mono text-sm font-semibold text-slate-400">NO ACTIVE INCIDENT</div>
        <p className="text-xs max-w-xs text-slate-500">
          Trigger a chaos scenario above or dispatch a synthetic alert webhook to generate an autonomous investigation ticket.
        </p>
      </div>
    );
  }

  const isPending = ticket.status === 'PENDING_APPROVAL';
  const isResolved = ticket.status === 'RESOLVED';
  const isRejected = ticket.status === 'REJECTED';

  const copyProposedFix = () => {
    if (ticket.proposed_fix) {
      navigator.clipboard.writeText(ticket.proposed_fix);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
  };

  const getSeverityStyle = (sev) => {
    if (sev?.includes('P0')) return 'bg-rose-950/90 text-rose-300 border-rose-600';
    if (sev?.includes('P1')) return 'bg-amber-950/90 text-amber-300 border-amber-600';
    return 'bg-blue-950/90 text-blue-300 border-blue-600';
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-5 flex flex-col gap-4">
      {/* Top Header & Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span className="font-mono font-bold text-sm text-slate-200">
            {ticket.ticket_id}
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getSeverityStyle(
              ticket.severity
            )}`}
          >
            {ticket.severity}
          </span>
        </div>

        {/* Previous Tickets Selector */}
        {allIncidents && allIncidents.length > 1 && (
          <select
            value={ticket.ticket_id}
            onChange={(e) => onSelectTicket(e.target.value)}
            className="text-[11px] font-mono bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
          >
            {allIncidents.map((inc) => (
              <option key={inc.ticket_id} value={inc.ticket_id}>
                {inc.ticket_id} - {inc.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 leading-snug">
          {ticket.title}
        </h3>
        <div className="text-[11px] text-slate-400 font-mono mt-1">
          Created: {new Date(ticket.created_at).toLocaleString()}
        </div>
      </div>

      {/* Confidence & MTTD Metrics Card */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono text-center">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Confidence</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">
            {ticket.confidence_score}%
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full"
              style={{ width: `${ticket.confidence_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">MTTD</div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">
            {ticket.mttd_seconds ? `${ticket.mttd_seconds}s` : '--'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">MTTR</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {ticket.mttr_seconds ? `${ticket.mttr_seconds}s` : '--'}
          </div>
        </div>
      </div>

      {/* Root Cause Summary */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5 mb-1">
          <Activity className="w-3.5 h-3.5" /> Root Cause Analysis
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {ticket.root_cause_summary}
        </p>
      </div>

      {/* Cascading Failure Map */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="text-[11px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5 mb-1">
          <GitFork className="w-3.5 h-3.5" /> Cascading Impact Chain
        </div>
        <div className="text-xs font-mono text-rose-200/90 leading-relaxed bg-rose-950/20 p-2 rounded border border-rose-900/30">
          {ticket.cascading_failure_map}
        </div>
      </div>

      {/* Proposed Remediation Fix */}
      <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Proposed Remediation Fix
          </span>
          <button
            onClick={copyProposedFix}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copiedFix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedFix ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-2.5 rounded border border-emerald-950/50 overflow-x-auto whitespace-pre-wrap">
          {ticket.proposed_fix}
        </pre>
      </div>

      {/* Action Items Checklist */}
      {ticket.action_items && ticket.action_items.length > 0 && (
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5 mb-2">
            <ListChecks className="w-3.5 h-3.5 text-cyan-400" /> SRE Action Checklist
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
            {ticket.action_items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
        <span className="text-xs font-mono text-slate-400">Current Status:</span>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
            isPending
              ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse'
              : isResolved
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
              : 'bg-rose-950 text-rose-300 border border-rose-600'
          }`}
        >
          {isPending && <AlertOctagon className="w-3.5 h-3.5" />}
          {isResolved && <CheckCircle className="w-3.5 h-3.5" />}
          {isRejected && <XCircle className="w-3.5 h-3.5" />}
          {ticket.status}
        </span>
      </div>

      {/* HITL Action Controls */}
      {isPending ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1 justify-center">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>MANDATORY PAUSE: Human Authorization Required</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              disabled={isApproving}
              onClick={() => onApproveFix(ticket.ticket_id)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproving ? 'Executing...' : 'Approve & Execute Fix'}</span>
            </button>

            <button
              disabled={isApproving}
              onClick={() => onOpenOverrideModal(ticket)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-mono text-xs font-bold border border-rose-800/80 transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject / Override</span>
            </button>
          </div>
        </div>
      ) : isResolved ? (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => onExportPostMortem(ticket.ticket_id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Post-Mortem (.md)</span>
          </button>
          <button
            onClick={() => onViewPostMortem(ticket.ticket_id)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>View</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
