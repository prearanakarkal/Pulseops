import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  GitCommit, 
  Compass, 
  ShieldCheck, 
  Cpu, 
  RefreshCw, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function RawDataDrawer() {
  const [activeTab, setActiveTab] = useState('server_logs');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const tabs = [
    { id: 'server_logs', label: 'Server Logs', icon: FileText },
    { id: 'deployments', label: 'Deployments', icon: GitCommit },
    { id: 'service_traces', label: 'Distributed Traces', icon: Compass },
    { id: 'db_clusters', label: 'DB Clusters', icon: Database },
    { id: 'ssl_gateways', label: 'SSL & Gateway', icon: ShieldCheck },
    { id: 'node_metrics', label: 'Node Metrics', icon: Cpu }
  ];

  const fetchData = async (tabName) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data/raw/${tabName}?limit=30`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch raw collection:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    return JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase">
            MongoDB Inspection Drawer
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {filteredData.length} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44 font-mono"
            />
          </div>

          <button
            onClick={() => fetchData(activeTab)}
            title="Refresh database view"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Tabs bar */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'border-cyan-500 text-cyan-300 font-bold bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Content */}
          <div className="p-3 overflow-y-auto max-h-56 font-mono text-xs space-y-2 bg-slate-950/90">
            {loading ? (
              <div className="py-6 text-center text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading MongoDB collection...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-6 text-center text-slate-500">No matching records found.</div>
            ) : (
              filteredData.map((doc, idx) => (
                <div
                  key={doc._id || idx}
                  className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-cyan-400">{doc._id || `doc-${idx}`}</span>
                    <span className="opacity-70">{doc.timestamp || doc.updated_at || ''}</span>
                  </div>
                  <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
