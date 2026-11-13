import React, { useState } from 'react';
import { X, Bell, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WebhookModal({ isOpen, onClose, ticketId }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTestWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl) return;

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/integrations/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          ticket_id: ticketId
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        setStatus({ ok: true, message: `Notification sent successfully! (HTTP ${data.status_code})` });
      } else {
        setStatus({ ok: false, message: data.error || 'Failed to dispatch webhook' });
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-sm text-slate-200">
              Slack / Discord Webhook Notification
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTestWebhook} className="p-5 flex flex-col gap-3 text-xs font-mono">
          <p className="text-slate-400 font-sans leading-relaxed text-xs">
            Push real-time incident diagnosis reports and P0 alerts to your SRE on-call channel. Paste an incoming webhook URL below to test delivery.
          </p>

          <div>
            <label className="text-slate-400 block mb-1">Webhook URL:</label>
            <input
              type="url"
              required
              placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          {status && (
            <div
              className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                status.ok
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              {status.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="leading-snug">{status.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Dispatching...' : 'Test Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
