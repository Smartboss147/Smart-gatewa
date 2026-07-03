import React, { useState, useEffect } from 'react';
import { Tv, CheckCircle, Zap } from 'lucide-react';
import { DbUser } from '../types.ts';
import { CABLE_BOUQUETS, CableBouquet } from '../data/vtuData.ts';

interface CableFormProps {
  user: DbUser;
  onPayCable: (provider: string, smartcardNumber: string, planName: string, price: number) => Promise<void>;
}

export default function CableForm({ user, onPayCable }: CableFormProps) {
  const [provider, setProvider] = useState<'DSTV' | 'GOtv' | 'Startimes'>('DSTV');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const bouquets = CABLE_BOUQUETS[provider] || [];

  useEffect(() => {
    if (bouquets.length > 0) {
      setSelectedPlanId(bouquets[0].id);
    } else {
      setSelectedPlanId('');
    }
  }, [provider]);

  const activeBouquet = bouquets.find(b => b.id === selectedPlanId);

  // Simulate lookup customer smartcard name
  const handleSmartcardBlur = async () => {
    setErrorMsg('');
    setVerifiedName('');
    
    if (smartcardNumber.length < 10 || smartcardNumber.length > 11) {
      return;
    }

    setIsVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const names = [
        'DR. JOHNSON ADEOLU (Bouquet Status: INACTIVE)',
        'FATIMA BELLO (Bouquet Status: ACTIVE - EXPIRES IN 2 DAYS)',
        'EMEKA NNAJI (Bouquet Status: INACTIVE)',
        'BIODUN SHONIBRE (Bouquet Status: SUSPENDED)',
      ];
      const selectedName = names[parseInt(smartcardNumber.slice(-1)) % names.length];
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

    if (smartcardNumber.length < 10 || smartcardNumber.length > 11) {
      setErrorMsg('Please enter a valid 10 to 11-digit smartcard or decoder IUC number.');
      return;
    }

    if (!activeBouquet) {
      setErrorMsg('Please select a valid subscription bouquet package.');
      return;
    }

    const priceKobo = Math.floor(activeBouquet.price * 100);
    if (user.walletBalance < priceKobo) {
      setErrorMsg('Insufficient wallet balance. Please top up your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      await onPayCable(provider, smartcardNumber, activeBouquet.name, activeBouquet.price);
      setSuccessMsg(`Renewed ${provider} ${activeBouquet.name} bouquet for Smartcard ${smartcardNumber} successfully!`);
      setSmartcardNumber('');
      setVerifiedName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Cable subscription failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
          <Tv className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Cable TV Subscriptions</h3>
          <p className="text-[11px] text-slate-400">Reactivate DSTV, GOtv, or Startimes decoders</p>
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

        {/* Cable Provider Choose */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cable TV Operator</label>
          <div className="grid grid-cols-3 gap-2">
            {['DSTV', 'GOtv', 'Startimes'].map((p) => (
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

        {/* Smartcard Number */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Smartcard / IUC / UIC Number</label>
          <input
            type="text"
            maxLength={11}
            value={smartcardNumber}
            onChange={(e) => setSmartcardNumber(e.target.value.replace(/\D/g, ''))}
            onBlur={handleSmartcardBlur}
            placeholder="e.g. 1023485012"
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
            required
          />

          {isVerifying && (
            <span className="text-[10px] text-blue-500 animate-pulse mt-1 block font-mono">
              Verifying smartcard status and owner details...
            </span>
          )}

          {verifiedName && (
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md mt-1.5 inline-block">
              ✓ Verified Smartcard Account: {verifiedName}
            </span>
          )}
        </div>

        {/* Cable Package Bouquet list */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Package Bouquet</label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            disabled={isLoading || bouquets.length === 0}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-medium text-slate-800"
          >
            {bouquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} - ₦{b.price.toLocaleString()} / month
              </option>
            ))}
          </select>
        </div>

        {/* Selected Plan Cost display */}
        {activeBouquet && (
          <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-xs border border-slate-100">
            <div>
              <span className="text-slate-400 font-medium block">Subscription Term</span>
              <span className="font-bold text-slate-800">1 Month Renewal</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Renew Fee</span>
              <span className="font-bold text-blue-600">₦{activeBouquet.price.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Submit renew */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Renewing Decoder Subscription...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Renew Bouquet Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
