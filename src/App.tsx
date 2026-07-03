import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCustomToken,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { 
  CreditCard, 
  Smartphone, 
  Wifi, 
  Lightbulb, 
  Tv, 
  Gift, 
  ShieldCheck, 
  History,
  TrendingUp,
  Coins,
  Sparkles,
  Zap,
  CheckCircle,
  HelpCircle,
  Lock,
  Mail,
  UserCheck,
  ArrowRight,
  Phone,
  AlertCircle,
  RefreshCw,
  Send
} from 'lucide-react';

// Custom Modules
import { DbUser, DbTransaction, DbNotification } from './types.ts';
import Navbar from './components/Navbar.tsx';
import WalletCard from './components/WalletCard.tsx';
import AirtimeForm from './components/AirtimeForm.tsx';
import DataForm from './components/DataForm.tsx';
import ElectricityForm from './components/ElectricityForm.tsx';
import CableForm from './components/CableForm.tsx';
import HistoryList from './components/HistoryList.tsx';
import ReferralTab from './components/ReferralTab.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import SystemDiagnostics from './components/SystemDiagnostics.tsx';

export default function App() {
  
  // Auth states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Auth Form input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Application general lists
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'services', 'referrals', 'history', 'admin'
  const [activeServiceTab, setActiveServiceTab] = useState<'airtime' | 'data' | 'electricity' | 'cable'>('airtime');

  // Trigger loading details
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Manage Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch DB user profiles
        await syncUserWithDatabase(user);
      } else {
        setDbUser(null);
        setTransactions([]);
        setNotifications([]);
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, [refreshTrigger]);

  // Sync / Retrieve profile from database via JWT Authorization header
  const syncUserWithDatabase = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to synchronize user state.');
      }
      const data = await res.json();
      setDbUser(data.user);
      
      // Load user transactions and notifications in parallel
      await Promise.all([
        loadUserTransactions(idToken),
        loadUserNotifications(idToken)
      ]);
    } catch (err) {
      console.error('Error syncing user with database:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadUserTransactions = async (idToken: string) => {
    try {
      const res = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserNotifications = async (idToken: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Auth Actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isSignUp) {
        // Validate Nigerian 11-digit phone number if provided
        if (phone && !/^\d{11}$/.test(phone)) {
          throw new Error('Nigerian phone number must be exactly 11 digits (e.g., 08031234567).');
        }

        // Create user in Firebase
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Send initial email verification immediately
        try {
          await sendEmailVerification(credential.user);
          setVerificationEmailSent(true);
        } catch (verifErr) {
          console.error('Email verification trigger error:', verifErr);
        }

        const idToken = await credential.user.getIdToken();
        
        // Trigger background setup on DB by doing a profile update call
        await syncUserWithDatabase(credential.user);
        
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ fullName, phone })
        });
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed. Please check details.');
      setAuthLoading(false);
    }
  };

  // Password reset handler
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email) {
      setAuthError('Please enter your email address.');
      return;
    }
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to send password reset email.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Resend Verification Email handler
  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setAuthError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationEmailSent(true);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to resend verification email.');
    }
  };

  // Check/refresh the email verification status of logged-in user
  const handleRefreshVerificationStatus = async () => {
    if (!auth.currentUser) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await auth.currentUser.reload();
      const refreshedUser = auth.currentUser;
      setCurrentUser(refreshedUser);
      if (refreshedUser.emailVerified) {
        await syncUserWithDatabase(refreshedUser);
      } else {
        setAuthError('Your email is still unverified. Please check your inbox or spam folder.');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Failed to refresh authentication status.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Automated Quick Sandbox Demo Login
  const handleSandboxDemoLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      // Use standard preconfigured credentials in Firebase sandbox for quick, friction-free testing
      const sandboxEmail = 'sandbox.testuser@smartgateway.com';
      const sandboxPass = 'SandboxUser123!';
      
      try {
        await signInWithEmailAndPassword(auth, sandboxEmail, sandboxPass);
      } catch (signInErr) {
        // If account doesn't exist, register it on the fly!
        const credential = await createUserWithEmailAndPassword(auth, sandboxEmail, sandboxPass);
        const idToken = await credential.user.getIdToken();
        await syncUserWithDatabase(credential.user);
        
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ fullName: 'Chinedu Okeke' })
        });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Frictionless demo setup failed. Please try with direct email.');
      setAuthLoading(false);
    }
  };

  // Admin account quick access
  const handleAdminDemoLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const adminEmail = 'admin.moderator@smartgateway.com';
      const adminPass = 'AdminModerator99!';

      try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      } catch (signInErr) {
        // Register administrative account
        const credential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        const idToken = await credential.user.getIdToken();
        await syncUserWithDatabase(credential.user);

        await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ fullName: 'Audu Bello (Admin)' })
        });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Administrative bypass failed.');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await signOut(auth);
    setActiveTab('dashboard');
  };

  // 3. User Triggered VTU Operations
  const handleFundWallet = async (amountKobo: number, reference: string) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/wallet/fund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reference, amountKobo })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Funding verification failed.');
    }

    const data = await res.json();
    setDbUser(data.user);
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePurchaseAirtime = async (provider: string, phone: string, amount: number) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/vtu/airtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, phone, amount })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Airtime purchase failed.');
    }

    setRefreshTrigger(prev => prev + 1);
  };

  const handlePurchaseData = async (provider: string, phone: string, planId: string, planName: string, price: number) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/vtu/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, phone, planId, planName, price })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Data bundle subscription failed.');
    }

    setRefreshTrigger(prev => prev + 1);
  };

  const handlePayElectricity = async (provider: string, meterNumber: string, meterType: string, amount: number) => {
    if (!currentUser) return { token: undefined };
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/vtu/electricity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, meterNumber, meterType, amount })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Electricity payment failed.');
    }

    setRefreshTrigger(prev => prev + 1);
    return await res.json();
  };

  const handlePayCable = async (provider: string, smartcardNumber: string, planName: string, price: number) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/vtu/cable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, smartcardNumber, planName, price })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cable renewal failed.');
    }

    setRefreshTrigger(prev => prev + 1);
  };

  const handleUpdateReferralCode = async (referredBy: string) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ referredBy })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update referrer.');
    }

    setRefreshTrigger(prev => prev + 1);
  };

  const handleMarkNotificationRead = async (id: number) => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    setRefreshTrigger(prev => prev + 1);
  };

  // 4. Admin API Handlers (Invoked by AdminPanel subcomponent)
  const handleFetchAdminStats = async () => {
    if (!currentUser) return null;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorised admin dashboard call.');
    return await res.json();
  };

  const handleFetchAdminUsers = async () => {
    if (!currentUser) return [];
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorised admin query.');
    const data = await res.json();
    return data.users;
  };

  const handleFetchAdminTransactions = async () => {
    if (!currentUser) return [];
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/admin/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorised ledger call.');
    const data = await res.json();
    return data.transactions;
  };

  const handleAdjustUserWallet = async (targetId: number, amountKobo: number, actionType: 'credit' | 'debit') => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const res = await fetch(`/api/admin/users/${targetId}/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amountKobo, actionType })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to override user balance.');
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // Loader screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 animate-pulse uppercase tracking-widest">
          Authenticating Secure Connection...
        </p>
      </div>
    );
  }

  // 5. RENDER AUTHENTICATION VIEW IF LOGGED OUT
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100 mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>

          <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
            Smart<span className="text-blue-600">Gateway</span>
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Secure Nigerian Utility Bills, Airtime & Cable Recharge Terminal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-3xl border border-blue-50/50 space-y-6">
            
            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            {resetEmailSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold leading-relaxed">
                Password reset link has been successfully sent to <span className="font-bold">{email}</span>. Please check your inbox or spam folder!
              </div>
            )}

            {isForgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <span className="text-xs text-slate-500 block leading-normal">
                  Enter your registered email address below, and we will send you a secure link to reset your password.
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-colors cursor-pointer"
                >
                  Send Reset Link
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetEmailSent(false);
                      setAuthError('');
                    }}
                    className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  
                  {isSignUp && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alhaji Aminu Audu"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number (Nigerian, 11 digits)</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="08031234567"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@gmail.com"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {!isSignUp && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setAuthError('');
                        }}
                        className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-colors cursor-pointer"
                  >
                    {isSignUp ? 'Create Secured Account' : 'Authenticate Credentials'}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError('');
                    }}
                    className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Register Now'}
                  </button>
                </div>
              </>
            )}

            {/* Quick Demo Bypass (Frictionless Test buttons) */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center mb-1">
                Frictionless Sandbox Gates
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSandboxDemoLogin}
                  className="py-2.5 px-3 border border-blue-100 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <UserCheck className="w-4 h-4" /> Guest Demo User
                </button>
                <button
                  type="button"
                  onClick={handleAdminDemoLogin}
                  className="py-2.5 px-3 border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Controls
                </button>
              </div>
              <span className="text-[9px] text-slate-400 block text-center leading-normal italic">
                Sandbox mode pre-seeds N1,000 for testing wallet purchases instantly!
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // 5.5. RENDER EMAIL VERIFICATION WALL IF USER EMAIL IS UNVERIFIED
  // Note: We bypass this for Smart Gateway sandbox domain accounts to ensure seamless sandbox testing.
  const isDemoUser = currentUser?.email?.endsWith('@smartgateway.com');
  if (currentUser && !currentUser.emailVerified && !isDemoUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xl shadow-amber-100 mx-auto animate-pulse">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
            Verify Your Email
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            A verification link was sent to <span className="font-bold text-slate-700">{currentUser.email}</span>.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-3xl border border-blue-50/50 space-y-6">
            
            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            {verificationEmailSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold leading-relaxed">
                A fresh verification link has been successfully sent. Please check your inbox and spam folders!
              </div>
            )}

            <div className="space-y-4">
              <span className="text-xs text-slate-500 block leading-relaxed text-center">
                Please click the link inside the confirmation email to activate your secure Smart Gateway digital wallet and enable instant recharges.
              </span>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRefreshVerificationStatus}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} /> I Have Verified (Check Status)
                </button>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Resend Verification Email
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Sign Out of Account
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // 6. RENDER LOGGED IN WORKSPACE DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      
      {/* Top Navbar */}
      <Navbar
        user={dbUser}
        notificationsList={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onSignOut={handleSignOut}
        onNavigate={setActiveTab}
        activeTab={activeTab}
      />

      {/* Primary Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full space-y-8">
        
        {/* VIEW 1: MAIN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Wallet summary row */}
            <WalletCard 
              user={dbUser} 
              currentUser={currentUser}
              onFundWallet={handleFundWallet}
              onUpdateUser={(updatedUser) => {
                setDbUser(updatedUser);
                setRefreshTrigger(prev => prev + 1);
              }}
            />

            {/* Grid: Quick Actions / Buy Utilities form selector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Action Picker (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-blue-50 rounded-3xl p-6 shadow-xs space-y-4 h-fit">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Interactive Services Hub</h3>
                  <p className="text-[11px] text-slate-400">Instantly buy or renew telecom and utility plans</p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'airtime', label: 'Buy Airtime', icon: Smartphone, desc: 'MTN, Airtel, Glo, 9mobile instant topup', activeBg: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { id: 'data', label: 'Internet Data', icon: Wifi, desc: 'Cheap SME data bundles & gifting', activeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                    { id: 'electricity', label: 'Electricity Bill', icon: Lightbulb, desc: 'Recharge prepaid electric power tokens', activeBg: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { id: 'cable', label: 'Cable TV Decoder', icon: Tv, desc: 'DSTV, GOtv, Startimes fast bouquets renewal', activeBg: 'bg-pink-50 text-pink-700 border-pink-100' },
                  ].map((service) => {
                    const Icon = service.icon;
                    const isActive = activeServiceTab === service.id;
                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          setActiveServiceTab(service.id as any);
                          // Seamless scroll helper to bring billing panel to screen on mobile
                          document.getElementById('active-utility-form-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isActive 
                            ? `${service.activeBg} font-bold shadow-xs` 
                            : 'border-slate-50 bg-slate-50/50 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white' : 'bg-white shadow-xs'}`}>
                            <Icon className="w-5 h-5 shrink-0" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{service.label}</span>
                            <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-500">{service.desc}</span>
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Active Form display (7 cols) */}
              <div id="active-utility-form-card" className="lg:col-span-7">
                {activeServiceTab === 'airtime' && (
                  <AirtimeForm 
                    user={dbUser} 
                    onPurchaseAirtime={handlePurchaseAirtime} 
                  />
                )}
                {activeServiceTab === 'data' && (
                  <DataForm 
                    user={dbUser} 
                    onPurchaseData={handlePurchaseData} 
                  />
                )}
                {activeServiceTab === 'electricity' && (
                  <ElectricityForm 
                    user={dbUser} 
                    onPayElectricity={handlePayElectricity} 
                  />
                )}
                {activeServiceTab === 'cable' && (
                  <CableForm 
                    user={dbUser} 
                    onPayCable={handlePayCable} 
                  />
                )}
              </div>

            </div>

            {/* Quick history snippet */}
            <HistoryList transactions={transactions.slice(0, 5)} />

            {/* Environment Key Self-Test & Connection Diagnostics */}
            <SystemDiagnostics />

          </div>
        )}

        {/* VIEW 2: FULL SERVICES ENTRY */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold text-slate-800">Buy Utilities & Billing</h2>
              <p className="text-xs text-slate-500">Access instant digital telecom channels and national DisCo networks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AirtimeForm user={dbUser} onPurchaseAirtime={handlePurchaseAirtime} />
              <DataForm user={dbUser} onPurchaseData={handlePurchaseData} />
              <ElectricityForm user={dbUser} onPayElectricity={handlePayElectricity} />
              <CableForm user={dbUser} onPayCable={handlePayCable} />
            </div>
          </div>
        )}

        {/* VIEW 3: REFERRALS */}
        {activeTab === 'referrals' && (
          <ReferralTab 
            user={dbUser} 
            onUpdateReferralCode={handleUpdateReferralCode} 
          />
        )}

        {/* VIEW 4: TRANSACTION HISTORY */}
        {activeTab === 'history' && (
          <HistoryList transactions={transactions} />
        )}

        {/* VIEW 5: ADMIN CONSOLE */}
        {activeTab === 'admin' && (
          <AdminPanel
            onFetchAdminStats={handleFetchAdminStats}
            onFetchAdminUsers={handleFetchAdminUsers}
            onFetchAdminTransactions={handleFetchAdminTransactions}
            onAdjustUserWallet={handleAdjustUserWallet}
          />
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="text-center text-[10px] text-slate-400 font-mono mt-16 max-w-7xl mx-auto px-4 w-full">
        <p>© 2026 Smart Gateway. Licensed sandbox payment integrations. Test references are verified on Sandbox Gateway.</p>
      </footer>

    </div>
  );
}
