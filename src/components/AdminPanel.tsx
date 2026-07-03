import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Coins, 
  HelpCircle,
  FileCheck,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { DbUser, DbTransaction } from '../types.ts';

interface AdminPanelProps {
  onFetchAdminStats: () => Promise<any>;
  onFetchAdminUsers: () => Promise<DbUser[]>;
  onFetchAdminTransactions: () => Promise<DbTransaction[]>;
  onAdjustUserWallet: (userId: number, amountKobo: number, actionType: 'credit' | 'debit') => Promise<void>;
}

export default function AdminPanel({
  onFetchAdminStats,
  onFetchAdminUsers,
  onFetchAdminTransactions,
  onAdjustUserWallet
}: AdminPanelProps) {
  
  // States
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<DbUser[]>([]);
  const [txList, setTxList] = useState<DbTransaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);

  // Load all reports
  const loadReports = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [resStats, resUsers, resTx] = await Promise.all([
        onFetchAdminStats(),
        onFetchAdminUsers(),
        onFetchAdminTransactions()
      ]);
      setStats(resStats);
      setUsersList(resUsers);
      setTxList(resTx);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch admin log repositories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleWalletAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMessage('');

    const numericAmount = parseFloat(adjustmentAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please write a valid Naira amount.');
      return;
    }

    setIsUpdatingWallet(true);
    try {
      const amountKobo = Math.floor(numericAmount * 100);
      await onAdjustUserWallet(selectedUser.id, amountKobo, adjustmentType);
      
      // Refresh reports after success
      await loadReports();
      setSelectedUser(null);
      setAdjustmentAmount('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Wallet adjustment failed.');
    } finally {
      setIsUpdatingWallet(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const query = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.fullName?.toLowerCase().includes(query) ||
      u.referralCode.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading system administrative logs...</p>
      </div>
    );
  }

  return (
    <div id="admin-controls-dashboard" className="space-y-6">
      
      {/* 1. Header and Refresh button */}
      <div className="flex justify-between items-center bg-red-50/50 border border-red-100 p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500 text-white rounded-2xl shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Administrator Command Console</h2>
            <p className="text-xs text-red-700 font-semibold">Authorized Staff Access Only • Sandbox Mode</p>
          </div>
        </div>
        <button
          onClick={loadReports}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
        >
          Refresh Ledger
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-bold">
          {errorMessage}
        </div>
      )}

      {/* 2. Stats Dashboard Bento Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-white border border-blue-50 p-4 rounded-3xl shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered Users</span>
            <span className="text-xl font-extrabold text-blue-950 mt-1 block">{stats.totalUsers}</span>
          </div>

          <div className="bg-white border border-blue-50 p-4 rounded-3xl shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Inflow Funded</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
              ₦{(stats.totalFundingKobo / 100).toLocaleString()}
            </span>
          </div>

          <div className="bg-white border border-blue-50 p-4 rounded-3xl shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Utility Revenue</span>
            <span className="text-xl font-extrabold text-indigo-600 mt-1 block">
              ₦{(stats.totalUtilitiesKobo / 100).toLocaleString()}
            </span>
          </div>

          <div className="bg-white border border-blue-50 p-4 rounded-3xl shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Operation Cycles</span>
            <span className="text-xl font-extrabold text-slate-800 mt-1 block">{stats.totalTransactionsCount}</span>
          </div>

        </div>
      )}

      {/* 3. Main Split Section: Users Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Users directory list (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">User Account Directory</h3>
              <p className="text-[11px] text-slate-400">Manage and adjust subscriber wallet balances</p>
            </div>
            
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-8 pr-2.5 py-1 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  <th className="p-3">Subscriber</th>
                  <th className="p-3">Referral Code</th>
                  <th className="p-3 text-right">Wallet Balance</th>
                  <th className="p-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-xs italic text-slate-400">
                      No matching accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{user.fullName || 'Anonymous'}</div>
                        <div className="text-[10px] text-slate-400">{user.email}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-500">
                        {user.referralCode}
                      </td>
                      <td className="p-3 text-right font-bold font-sans text-slate-800">
                        ₦{(user.walletBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setAdjustmentType('credit');
                          }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all text-[10px] cursor-pointer"
                        >
                          Adjust Wallet
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Ledger Audits (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Global Operation Ledger</h3>
            <p className="text-[11px] text-slate-400">Full audit trail of all accounts and operations</p>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {txList.length === 0 ? (
              <div className="py-12 text-center text-xs italic text-slate-400">
                No ledger records registered.
              </div>
            ) : (
              txList.map((tx) => (
                <div key={tx.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 max-w-[140px] truncate">{tx.details}</span>
                    <span className="font-mono text-slate-500 text-[10px]">₦{(tx.amount / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100">
                      {tx.type.toUpperCase()}
                    </span>
                    <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ==================== ADJUST WALLET OVERLAY MODAL ==================== */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Wallet Adjustment</h4>
                  <p className="text-[10px] text-slate-400 max-w-[200px] truncate">Target: {selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleWalletAdjustmentSubmit} className="space-y-4">
                
                {/* Mode Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Adjustment Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('credit')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        adjustmentType === 'credit'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" /> Credit (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('debit')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        adjustmentType === 'debit'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-100 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5 text-red-500" /> Debit (-)
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount to Adjust (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                    <input
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                      placeholder="e.g. 5,000"
                      disabled={isUpdatingWallet}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold focus:outline-none"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Current user balance: ₦{(selectedUser.walletBalance / 100).toLocaleString()}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingWallet}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100 cursor-pointer flex items-center justify-center gap-1"
                >
                  {isUpdatingWallet ? (
                    'Processing adjust payload...'
                  ) : (
                    <>
                      Confirm Wallet {adjustmentType === 'credit' ? 'Credit' : 'Debit'}
                    </>
                  )}
                </button>

              </form>
            </div>

            <div className="bg-slate-50 py-3.5 px-6 border-t border-slate-100 text-center text-[9px] text-red-600 font-bold uppercase tracking-wider">
              Warning: Direct ledger balances override.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
