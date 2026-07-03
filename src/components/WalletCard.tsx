import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Copy, 
  Check, 
  CreditCard, 
  Users, 
  Gift, 
  HelpCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { DbUser } from '../types.ts';

interface WalletCardProps {
  user: DbUser;
  onFundWallet: (amountKobo: number, reference: string) => Promise<void>;
}

export default function WalletCard({ user, onFundWallet }: WalletCardProps) {
  const [showFundModal, setShowFundModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount to fund.');
      return;
    }

    if (parsedAmount < 100) {
      setErrorMsg('Minimum funding amount is ₦100.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setErrorMsg('Please enter a valid 16-digit debit card number.');
      return;
    }

    if (!cardExpiry || cardExpiry.length !== 5) {
      setErrorMsg('Please enter expiry date in MM/YY format.');
      return;
    }

    if (cardCvv.length !== 3) {
      setErrorMsg('Please enter a valid 3-digit CVV code.');
      return;
    }

    if (cardPin.length !== 4) {
      setErrorMsg('Please enter your 4-digit card security PIN.');
      return;
    }

    // Start simulation steps
    setIsLoading(true);
    try {
      setLoadingStep('Securing payment tunnel connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLoadingStep('Contacting Paystack secure gateway...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      setLoadingStep('Processing 3D-Secure 2FA validation...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLoadingStep('Authorizing wallet credit payload...');
      
      // Call the actual backend endpoint
      const mockPaystackRef = `PAYSTACK-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const amountKobo = Math.floor(parsedAmount * 100);
      
      await onFundWallet(amountKobo, mockPaystackRef);

      // Reset
      setShowFundModal(false);
      setAmountInput('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardPin('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Helper to format card number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(value);
    }
  };

  // Helper for MM/YY expiry formatting
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  return (
    <div id="wallet-card-panel" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* 1. Debit/Wallet Balance Card (7 cols) */}
      <div className="md:col-span-7 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white rounded-3xl p-6 shadow-xl shadow-blue-100 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500 rounded-full blur-3xl opacity-30 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-20 -ml-10 -mb-10"></div>

        {/* Header: Branding & Provider logo icon */}
        <div className="flex justify-between items-start z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100/80">Account Type</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-semibold capitalize">{user.role} wallet</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center backdrop-blur-xs font-mono text-[10px] font-bold">
            VERIFIED
          </div>
        </div>

        {/* Middle: Real balance */}
        <div className="my-4 z-10">
          <span className="text-[11px] uppercase tracking-wider text-blue-100/70 block font-medium">AVAILABLE BALANCE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ₦{(user.walletBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-blue-100/80 font-mono">NGN</span>
          </div>
        </div>

        {/* Footer: User Details and top-up trigger */}
        <div className="flex justify-between items-end border-t border-white/10 pt-4 z-10">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-blue-100/60 block">Owner ID</span>
            <span className="text-xs font-medium font-mono text-white max-w-[180px] block truncate">{user.fullName || user.email}</span>
          </div>
          <button
            onClick={() => setShowFundModal(true)}
            className="px-4 py-2 bg-white text-blue-600 rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Fund Wallet <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Referral & Link Quick Stats Panel (5 cols) */}
      <div className="md:col-span-5 bg-white border border-blue-50 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Earn 10% Referral Bonuses</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Invite your colleagues! When they fund their wallet, you automatically receive a 10% cash bonus credited directly to your account.
          </p>
        </div>

        {/* Referral Action */}
        <div className="mt-4 space-y-3">
          <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center border border-slate-100">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Referral Code</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{user.referralCode}</span>
            </div>
            <button
              onClick={copyReferralCode}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-500 cursor-pointer transition-all flex items-center gap-1 text-[11px] font-semibold"
            >
              {copiedCode ? (
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

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Earned Bonuses</span>
              <span className="text-xs font-bold text-emerald-800">
                ₦{(user.referralEarnings / 100).toLocaleString()}
              </span>
            </div>
            <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
              <span className="text-[9px] font-bold text-blue-600 block uppercase">Referred Code</span>
              <span className="text-xs font-bold text-blue-800">
                {user.referredBy ? 'VTU-LINKED' : 'NOT SET'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FUND WALLET MODAL (PAYSTACK SIMULATION) ==================== */}
      {showFundModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Paystack header banner */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <Coins className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Paystack Checkout</h4>
                  <p className="text-[10px] text-emerald-400 font-mono">Secured Sandbox Engine</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!isLoading) setShowFundModal(false);
                }}
                className="text-slate-400 hover:text-white transition-all text-sm cursor-pointer"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleFundSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Top-up Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 5,000"
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold focus:outline-none"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Minimum ₦100 to activate wallet.</span>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Debit Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4000 1234 5678 9010"
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Grid: Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Card Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">CVV Code</label>
                  <input
                    type="password"
                    maxLength={3}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* PIN code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Card Pin</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardPin}
                  onChange={(e) => setCardPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="✱ ✱ ✱ ✱"
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none"
                  required
                />
              </div>

              {/* Submit / Simulation Status */}
              <div className="pt-2">
                {isLoading ? (
                  <div className="text-center space-y-2 py-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-semibold text-blue-600 animate-pulse">{loadingStep}</p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-colors cursor-pointer"
                  >
                    Authorize ₦{amountInput ? parseFloat(amountInput).toLocaleString() : '0.00'} Payment
                  </button>
                )}
              </div>
            </form>

            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-mono">
                Paystack Verified Merchant Sandbox Integration (Test Mode Enabled)
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
