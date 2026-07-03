import React, { useState } from 'react';
import { Smartphone, CheckCircle, Zap } from 'lucide-react';
import { DbUser } from '../types.ts';

interface AirtimeFormProps {
  user: DbUser;
  onPurchaseAirtime: (provider: string, phone: string, amount: number) => Promise<void>;
}

const PROVIDERS = ['MTN', 'Airtel', 'Glo', '9mobile'];

export default function AirtimeForm({ user, onPurchaseAirtime }: AirtimeFormProps) {
  const [provider, setProvider] = useState<'MTN' | 'Airtel' | 'Glo' | '9mobile'>('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phone || phone.length !== 11 || !phone.startsWith('0')) {
      setErrorMsg('Please enter a valid 11-digit phone number starting with 0.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      setErrorMsg('Minimum airtime purchase is ₦100.');
      return;
    }

    const amountKobo = Math.floor(numericAmount * 100);
    if (user.walletBalance < amountKobo) {
      setErrorMsg('Insufficient wallet balance. Please top up your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      await onPurchaseAirtime(provider, phone, numericAmount);
      setSuccessMsg(`₦${numericAmount} ${provider} Airtime has been sent to ${phone} successfully!`);
      setPhone('');
      setAmount('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Airtime transaction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Instant Airtime Refill</h3>
          <p className="text-[11px] text-slate-400">Top-up any Nigerian carrier instantly</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Network Selector Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Network</label>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p as any)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  provider === p
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Phone number input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
          <input
            type="tel"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 08031234567"
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (₦)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100 - 50,000"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Charges: ₦0.00 (Free service)</span>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Refill Airtime Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
