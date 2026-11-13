import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';

export default function CustomAlertModal({ isOpen, onClose, onSendAlert }) {
  const [service, setService] = useState('payment-service');
  const [errorCode, setErrorCode] = useState('HTTP 500');
  const [severity, setSeverity] = useState('P0 - Critical');
  const [message, setMessage] = useState('Critical Connection Failure: pymongo connection pool exhausted (500/500). Checkout requests timing out.');
  const [scenarioId, setScenarioId] = useState('scenario_1');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSendAlert({
      service,
      error_code: errorCode,
      severity,
      message,
      scenario_id: scenarioId
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-sm text-slate-200">
              Simulate Inbound Webhook Alert
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs font-mono">
          <div className="text-slate-400 font-sans text-xs">
            Sends a synthetic alert to <code className="text-cyan-300">POST /api/webhooks/alert</code> as if delivered from Prometheus, PagerDuty, or Datadog.
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Target Service:</label>
            <select
              value={service}
              onChange={(e) => {
                const s = e.target.value;
                setService(s);
                if (s === 'payment-service') {
                  setScenarioId('scenario_1');
                  setErrorCode('HTTP 500');
                  setMessage('Critical Connection Failure: pymongo connection pool exhausted (500/500).');
                } else if (s === 'auth-service') {
                  setScenarioId('scenario_2');
                  setErrorCode('HTTP 503');
                  setMessage('Fatal: Memory leak and runaway CPU spike (98.4%) on auth-service worker pod.');
                } else if (s === 'api-gateway') {
                  setScenarioId('scenario_3');
                  setErrorCode('HTTP 504');
                  setMessage('Gateway Timeout: SSL certificate expired on orders.internal.infra upstream.');
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="payment-service">payment-service</option>
              <option value="auth-service">auth-service</option>
              <option value="api-gateway">api-gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Error Code:</label>
              <input
                type="text"
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Severity:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="P0 - Critical">P0 - Critical</option>
                <option value="P1 - High">P1 - High</option>
                <option value="P2 - Medium">P2 - Medium</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Alert Payload Message:</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Dispatch Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
