import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function OverrideModal({ ticket, isOpen, onClose, onSubmitOverride }) {
  const [overrideNotes, setOverrideNotes] = useState('');
  const [newSeverity, setNewSeverity] = useState(ticket?.severity || 'P1 - High');
  const [actionType, setActionType] = useState('reject'); // 'reject' or 'override_resolve'

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitOverride({
      approved: actionType === 'override_resolve',
      override_notes: overrideNotes,
      new_severity: newSeverity
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-bold text-sm text-slate-200">
              Human Operator Override: {ticket.ticket_id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Select Human Intervention Action:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('reject')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  actionType === 'reject'
                    ? 'bg-rose-950 border-rose-600 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Reject Proposed Fix
              </button>
              <button
                type="button"
                onClick={() => setActionType('override_resolve')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  actionType === 'override_resolve'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Manual Resolve Override
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Adjust Severity Level:</label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="P0 - Critical">P0 - Critical</option>
              <option value="P1 - High">P1 - High</option>
              <option value="P2 - Medium">P2 - Medium</option>
              <option value="P3 - Low">P3 - Low</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Operator Justification / Notes:</label>
            <textarea
              required
              rows={3}
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="e.g. Rejecting automated rollback because database migration was already executed; manual hotfix scheduled."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-lg text-white font-bold transition-all shadow ${
                actionType === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
              }`}
            >
              Submit Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
