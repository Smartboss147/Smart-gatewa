import React, { useState, useEffect } from 'react';
import { Wifi, CheckCircle, Zap } from 'lucide-react';
import { DbUser } from '../types.ts';
import { DATA_PLANS, DataPlan } from '../data/vtuData.ts';

interface DataFormProps {
  user: DbUser;
  onPurchaseData: (provider: string, phone: string, planId: string, planName: string, price: number) => Promise<void>;
}

export default function DataForm({ user, onPurchaseData }: DataFormProps) {
  const [provider, setProvider] = useState<'MTN' | 'Airtel' | 'Glo' | '9mobile'>('MTN');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const plans = DATA_PLANS[provider] || [];

  // Reset selected plan when provider changes
  useEffect(() => {
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    } else {
      setSelectedPlanId('');
    }
  }, [provider]);

  const activePlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phone || phone.length !== 11 || !phone.startsWith('0')) {
      setErrorMsg('Please enter a valid 11-digit phone number starting with 0.');
      return;
    }

    if (!activePlan) {
      setErrorMsg('Please select a valid data plan bundle.');
      return;
    }

    const priceKobo = Math.floor(activePlan.price * 100);
    if (user.walletBalance < priceKobo) {
      setErrorMsg('Insufficient wallet balance. Please fund your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      await onPurchaseData(provider, phone, activePlan.id, activePlan.name, activePlan.price);
      setSuccessMsg(`${provider} ${activePlan.name} bundle successfully loaded on ${phone}!`);
      setPhone('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Data bundle subscription failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
          <Wifi className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Internet Data Bundles</h3>
          <p className="text-[11px] text-slate-400">High-speed SME & Gifting data packages</p>
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

        {/* Network provider toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Network Provider</label>
          <div className="grid grid-cols-4 gap-2">
            {['MTN', 'Airtel', 'Glo', '9mobile'].map((p) => (
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

        {/* Phone number */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recipient Phone Number</label>
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

        {/* Plan list selector dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Bundle Offer</label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            disabled={isLoading || plans.length === 0}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-medium"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - ₦{p.price} ({p.validity})
              </option>
            ))}
          </select>
        </div>

        {/* Price and Balance Feedback */}
        {activePlan && (
          <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-xs border border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">Price</span>
              <span className="font-bold text-slate-800">₦{activePlan.price}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Validity</span>
              <span className="font-bold text-blue-600">{activePlan.validity}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing Bundle...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Subscribe Bundle
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
