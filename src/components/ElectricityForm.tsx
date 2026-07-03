import React, { useState } from 'react';
import { Lightbulb, CheckCircle, Copy, Check, Info } from 'lucide-react';
import { DbUser } from '../types.ts';
import { DISCO_COMPANIES } from '../data/vtuData.ts';

interface ElectricityFormProps {
  user: DbUser;
  onPayElectricity: (provider: string, meterNumber: string, meterType: string, amount: number) => Promise<{ token?: string }>;
}

export default function ElectricityForm({ user, onPayElectricity }: ElectricityFormProps) {
  const [provider, setProvider] = useState(DISCO_COMPANIES[0].code);
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [amount, setAmount] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [purchasedToken, setPurchasedToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Simulate lookup customer meter
  const handleMeterBlur = async () => {
    setErrorMsg('');
    setVerifiedName('');
    
    if (meterNumber.length < 10 || meterNumber.length > 13) {
      return;
    }

    setIsVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Set dummy name based on digits to simulate lookup
      const names = [
        'EVELYN OBI (Customer: #450912)',
        'MOHAMMED YAKUBU (Customer: #310243)',
        'CHIDI OKAFOR (Customer: #984501)',
        'FOLASHADE ALAO (Customer: #129480)',
      ];
      const selectedName = names[parseInt(meterNumber.slice(-1)) % names.length];
      setVerifiedName(selectedName);
    } catch (e) {
      // ignore
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setPurchasedToken('');

    if (meterNumber.length < 10 || meterNumber.length > 13) {
      setErrorMsg('Please enter a valid 10 to 13-digit Meter Number.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 1000) {
      setErrorMsg('Minimum electricity bill purchase is ₦1,000.');
      return;
    }

    const amountKobo = Math.floor(numericAmount * 100);
    if (user.walletBalance < amountKobo) {
      setErrorMsg('Insufficient wallet balance. Please top up.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await onPayElectricity(provider, meterNumber, meterType, numericAmount);
      
      let msg = `₦${numericAmount.toLocaleString()} payment to ${provider} Meter ${meterNumber} succeeded!`;
      if (meterType === 'postpaid') {
        msg += ' Your bill has been updated.';
      }
      setSuccessMsg(msg);
      
      if (response.token) {
        setPurchasedToken(response.token);
      }

      // Reset
      setMeterNumber('');
      setAmount('');
      setVerifiedName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Electricity bill transaction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(purchasedToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Electricity Bill Payment</h3>
          <p className="text-[11px] text-slate-400">Renew prepaid tokens & clear postpaid debts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Highlighted Prepaid Token Banner */}
        {purchasedToken && (
          <div className="bg-blue-600 text-white p-4 rounded-2xl space-y-2 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">PREPAID METER TOKEN</span>
            <div className="flex justify-between items-center bg-black/15 p-3 rounded-xl border border-white/10">
              <span className="font-mono text-base font-bold tracking-widest">{purchasedToken}</span>
              <button
                type="button"
                onClick={copyTokenToClipboard}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                title="Copy Token"
              >
                {copiedToken ? <Check className="w-4.5 h-4.5 text-emerald-300" /> : <Copy className="w-4.5 h-4.5" />}
              </button>
            </div>
            <p className="text-[10px] text-blue-100 leading-normal flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" /> Input this 20-digit token on your meter keyboard to credit power units.
            </p>
          </div>
        )}

        {/* DisCo Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Distribution Company (DisCo)</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-medium text-slate-800"
          >
            {DISCO_COMPANIES.map((disco) => (
              <option key={disco.code} value={disco.code}>
                {disco.name}
              </option>
            ))}
          </select>
        </div>

        {/* Meter Type Toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meter Type</label>
          <div className="grid grid-cols-2 gap-3">
            {['prepaid', 'postpaid'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMeterType(type as any)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all text-center capitalize cursor-pointer ${
                  meterType === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type} Meter
              </button>
            ))}
          </div>
        </div>

        {/* Meter number */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meter Number</label>
          <input
            type="text"
            value={meterNumber}
            onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ''))}
            onBlur={handleMeterBlur}
            placeholder="e.g. 45091248012"
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
            required
          />

          {isVerifying && (
            <span className="text-[10px] text-blue-500 animate-pulse mt-1 block font-mono">
              Verifying meter database profile...
            </span>
          )}

          {verifiedName && (
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md mt-1.5 inline-block">
              ✓ Verified Owner: {verifiedName}
            </span>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount to Purchase (₦)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Min ₦1,000"
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none"
              required
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Provider convenience fee: ₦100.00 (Waived)</span>
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authorizing utility payment...
              </>
            ) : (
              <>
                Pay Electricity Bill
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
