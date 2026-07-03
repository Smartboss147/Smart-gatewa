import { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Smartphone, 
  Wifi, 
  Lightbulb, 
  Tv, 
  Gift,
  Search,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import { DbTransaction } from '../types.ts';

interface HistoryListProps {
  transactions: DbTransaction[];
}

export default function HistoryList({ transactions }: HistoryListProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTransactions = transactions.filter((tx) => {
    // Type Filter
    if (filterType !== 'all') {
      if (filterType === 'utilities' && !['airtime', 'data', 'electricity', 'cable'].includes(tx.type)) return false;
      if (filterType === 'wallet' && !['wallet_funding', 'admin_credit', 'admin_debit'].includes(tx.type)) return false;
      if (filterType === 'referrals' && tx.type !== 'referral_bonus') return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchDetails = tx.details.toLowerCase().includes(query);
      const matchRef = tx.reference.toLowerCase().includes(query);
      const matchRecipient = tx.recipient?.toLowerCase().includes(query) || false;
      return matchDetails || matchRef || matchRecipient;
    }

    return true;
  });

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'wallet_funding':
      case 'admin_credit':
        return (
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        );
      case 'admin_debit':
        return (
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        );
      case 'airtime':
        return (
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Smartphone className="w-5 h-5" />
          </div>
        );
      case 'data':
        return (
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Wifi className="w-5 h-5" />
          </div>
        );
      case 'electricity':
        return (
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <Lightbulb className="w-5 h-5" />
          </div>
        );
      case 'cable':
        return (
          <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
            <Tv className="w-5 h-5" />
          </div>
        );
      case 'referral_bonus':
        return (
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Gift className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
            <FileCheck className="w-5 h-5" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            Successful
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="transaction-history-list" className="bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Transaction History Log</h3>
          <p className="text-xs text-slate-400">Audit and trace payments processed on this account</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4.5 h-4.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, phone, or detail..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-50">
        <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-1.5 shrink-0" />
        {[
          { id: 'all', label: 'All Transactions' },
          { id: 'wallet', label: 'Wallet Fundings' },
          { id: 'utilities', label: 'Utility Purchases' },
          { id: 'referrals', label: 'Referral Rewards' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilterType(chip.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === chip.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* List content */}
      <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">
            No transactions found matching criteria.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isCredit = ['wallet_funding', 'admin_credit', 'referral_bonus'].includes(tx.type);
            return (
              <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 group hover:bg-slate-50/40 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  {getTxIcon(tx.type)}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{tx.details}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono flex-wrap">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-[9px] font-bold">
                        {tx.type.toUpperCase().replace('_', ' ')}
                      </span>
                      <span>Ref: {tx.reference}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-bold font-mono ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isCredit ? '+' : '-'}₦{(tx.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
