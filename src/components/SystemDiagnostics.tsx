import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Globe
} from 'lucide-react';

interface DiagnosticData {
  dbConnected: boolean;
  firebaseAdminConfigured: boolean;
  paystackConfigured: boolean;
  paystackMode: 'test_mode' | 'live_mode' | 'inactive';
  adminEmailConfigured: boolean;
  timestamp: string;
}

export default function SystemDiagnostics() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDiagnostics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/system/diagnostics');
      if (!res.ok) {
        throw new Error('Failed to load system diagnostic check payload.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to communicate with diagnostic backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div id="system-credentials-diagnostics-card" className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Environment Key & Gateway Diagnostics
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Test and verify if your server-side environment credentials and payment gateways are active.
          </p>
        </div>

        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Self-Test
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Database Connection */}
        <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-start gap-3 relative overflow-hidden">
          <div className={`p-2 rounded-xl ${data?.dbConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Database Storage</span>
            <span className="text-xs font-extrabold text-slate-800 mt-1 block">
              {loading ? 'Testing...' : (data?.dbConnected ? 'PG / SQLite Connected' : 'Database Offline')}
            </span>
            <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${data?.dbConnected ? 'text-emerald-600' : 'text-red-500'}`}>
              {data?.dbConnected ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {data?.dbConnected ? 'Active Connection' : 'Failure'}
            </span>
          </div>
        </div>

        {/* 2. Firebase Admin SDK */}
        <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-start gap-3 relative overflow-hidden">
          <div className={`p-2 rounded-xl ${data?.firebaseAdminConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Firebase Admin</span>
            <span className="text-xs font-extrabold text-slate-800 mt-1 block">
              {loading ? 'Testing...' : (data?.firebaseAdminConfigured ? 'Admin SDK Ready' : 'Applet Config Fallback')}
            </span>
            <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${data?.firebaseAdminConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
              {data?.firebaseAdminConfigured ? <CheckCircle className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
              {data?.firebaseAdminConfigured ? 'Keys Configured' : 'Using Local Config'}
            </span>
          </div>
        </div>

        {/* 3. Paystack secret key status */}
        <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-start gap-3 relative overflow-hidden">
          <div className={`p-2 rounded-xl ${data?.paystackConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-500'}`}>
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Paystack Gateway</span>
            <span className="text-xs font-extrabold text-slate-800 mt-1 block">
              {loading ? 'Testing...' : (data?.paystackConfigured ? 'Real gateway active' : 'Sandbox Simulator active')}
            </span>
            <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${data?.paystackConfigured ? 'text-emerald-600' : 'text-slate-500'}`}>
              {data?.paystackConfigured ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {data?.paystackConfigured ? (data?.paystackMode === 'live_mode' ? 'LIVE MODE active' : 'TEST MODE active') : 'SIMULATION MODE'}
            </span>
          </div>
        </div>

        {/* 4. Admin email rules */}
        <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-start gap-3 relative overflow-hidden">
          <div className={`p-2 rounded-xl ${data?.adminEmailConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admin Privilege List</span>
            <span className="text-xs font-extrabold text-slate-800 mt-1 block">
              {loading ? 'Testing...' : (data?.adminEmailConfigured ? 'Admin list active' : 'Default sandbox list')}
            </span>
            <span className={`text-[10px] font-semibold mt-1 inline-flex items-center gap-1 ${data?.adminEmailConfigured ? 'text-emerald-600' : 'text-amber-500'}`}>
              {data?.adminEmailConfigured ? <CheckCircle className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
              {data?.adminEmailConfigured ? 'ADMIN_EMAIL active' : 'Default loaded'}
            </span>
          </div>
        </div>

      </div>

      <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-50 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></div>
        <p className="text-[10.5px] text-blue-900 leading-relaxed font-semibold">
          {data?.paystackConfigured ? (
            <span><strong>Real Payment Gateway Connected!</strong> Your <code>PAYSTACK_SECRET_KEY</code> is active. Any deposit requests will initialize a secure Paystack checkout form that can be completed online.</span>
          ) : (
            <span><strong>Offline / Sandbox Simulator Active:</strong> To process real transactions, add your Paystack API Secret Key as <code>PAYSTACK_SECRET_KEY</code> inside your environment configuration settings. Right now, a beautiful sandbox debit-card checkout simulator is loaded.</span>
          )}
        </p>
      </div>
    </div>
  );
}
