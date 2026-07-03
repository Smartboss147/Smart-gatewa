import React, { useState } from 'react';
import { 
  Gift, 
  UserPlus, 
  Coins, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { DbUser } from '../types.ts';

interface ReferralTabProps {
  user: DbUser;
  onUpdateReferralCode: (code: string) => Promise<void>;
}

export default function ReferralTab({ user, onUpdateReferralCode }: ReferralTabProps) {
  const [referredByInput, setReferredByInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitReferredBy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const code = referredByInput.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Please enter a valid referral code.');
      return;
    }

    if (code === user.referralCode) {
      setErrorMsg('You cannot use your own referral code.');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateReferralCode(code);
      setSuccessMsg('Referrer linked successfully! You are now eligible for our rewards.');
      setReferredByInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update referrer. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="referrals-dashboard" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Primary Campaign Details (7 cols) */}
      <div className="md:col-span-7 space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-50">
            Smart Gateway Partner Program
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-3 tracking-tight">Earn ₦ for every peer you refer!</h2>
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">
            Invite friends to Smart Gateway using your unique code. When they fund their wallet, you get a <strong className="text-white">10% instant cash bonus</strong> from their first deposit amount credited directly to your wallet!
          </p>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-200 block uppercase font-bold">Your Unique Code</span>
              <span className="text-lg font-mono font-bold">{user.referralCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-white text-blue-700 rounded-xl text-xs font-bold shadow-md hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* How it works cards */}
        <div className="bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">How the Referral Program Works</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">1</span>
              <h4 className="text-xs font-bold text-slate-800">Share Your Code</h4>
              <p className="text-[10px] text-slate-400 leading-normal">Give your code to friends, family or colleagues.</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">2</span>
              <h4 className="text-xs font-bold text-slate-800">They Top up</h4>
              <p className="text-[10px] text-slate-400 leading-normal">They sign up and fund their wallet with any amount starting at ₦100.</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">3</span>
              <h4 className="text-xs font-bold text-slate-800">Get Cash Back</h4>
              <p className="text-[10px] text-slate-400 leading-normal">Get credited with 10% of their deposit. Unlimited payouts!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats and Linked referrals (5 cols) */}
      <div className="md:col-span-5 space-y-6">
        
        {/* earnings summary */}
        <div className="bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Earnings Overview</h3>
              <p className="text-[11px] text-slate-400">Your referral commission summary</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100/40 rounded-2xl">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Total Bonus Received</span>
              <span className="text-2xl font-bold text-emerald-800">
                ₦{(user.referralEarnings / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Enter Referrer Code Form */}
        <div className="bg-white rounded-3xl border border-blue-50 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Who Referred You?</h3>
              <p className="text-[11px] text-slate-400">Link your friends code to unlock system perks</p>
            </div>
          </div>

          {user.referredBy ? (
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-2 text-xs text-blue-800 font-medium">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              <span>You were successfully referred by <strong className="font-mono">{user.referredBy}</strong></span>
            </div>
          ) : (
            <form onSubmit={handleSubmitReferredBy} className="space-y-3">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Enter SG-XXXXXX Code"
                  value={referredByInput}
                  onChange={(e) => setReferredByInput(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-mono tracking-widest focus:outline-none placeholder:font-sans placeholder:tracking-normal"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 cursor-pointer transition-colors"
              >
                {isLoading ? 'Verifying Code...' : 'Link Referrer Code'}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
