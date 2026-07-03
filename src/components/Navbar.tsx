import { useState } from 'react';
import { 
  Bell, 
  User, 
  LogOut, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle, 
  Menu, 
  X,
  CreditCard
} from 'lucide-react';
import { DbUser, DbNotification } from '../types.ts';

interface NavbarProps {
  user: DbUser;
  notificationsList: DbNotification[];
  onMarkNotificationRead: (id: number) => void;
  onSignOut: () => void;
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export default function Navbar({
  user,
  notificationsList,
  onMarkNotificationRead,
  onSignOut,
  onNavigate,
  activeTab
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const unreadCount = notificationsList.filter(n => !n.isRead).length;

  return (
    <nav className="bg-white border-b border-blue-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Main Tabs */}
          <div className="flex items-center">
            <div 
              className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                <CreditCard className="w-5.5 h-5.5" />
              </div>
              <span className="text-xl font-bold text-blue-900 tracking-tight">
                Smart<span className="text-blue-600">Gateway</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'services', label: 'Buy Utilities' },
                { id: 'referrals', label: 'Referrals' },
                { id: 'history', label: 'History' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'admin'
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Controls
                </button>
              )}
            </div>
          </div>

          {/* Balance Summary & Profile Interactions */}
          <div className="flex items-center gap-4">
            
            {/* Quick Wallet Balance Badge */}
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-blue-50 border border-blue-100/60 rounded-xl">
              <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Wallet Balance</span>
              <span className="text-sm font-bold text-blue-950 font-sans">
                ₦{(user.walletBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Notifications trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMobileMenu(false);
                }}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all relative"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 max-h-96 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-50 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-blue-600 font-medium">{unreadCount} unread</span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {notificationsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No notifications yet
                      </div>
                    ) : (
                      notificationsList.map((notify) => (
                        <div 
                          key={notify.id} 
                          className={`p-3 text-xs transition-all flex flex-col gap-1 rounded-lg ${
                            !notify.isRead ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-slate-800">{notify.title}</span>
                            {!notify.isRead && (
                              <button 
                                onClick={() => onMarkNotificationRead(notify.id)}
                                className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-slate-500 leading-relaxed">{notify.message}</p>
                          <span className="text-[9px] text-slate-400">{new Date(notify.createdAt).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Sign-out Action */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 max-w-28 truncate">{user.fullName || user.email}</span>
                <span className="text-[9px] text-slate-400 capitalize">{user.role} Account</span>
              </div>
              <button
                onClick={onSignOut}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => {
                setShowMobileMenu(!showMobileMenu);
                setShowNotifications(false);
              }}
              className="md:hidden p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown drawer */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-2">
          
          <div className="py-2.5 px-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block">Wallet Balance</span>
              <span className="text-base font-bold text-blue-950 font-sans">
                ₦{(user.walletBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            {user.referralEarnings > 0 && (
              <div className="text-right">
                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider block">Ref Earnings</span>
                <span className="text-xs font-bold text-emerald-700">
                  ₦{(user.referralEarnings / 100).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'services', label: 'Buy Utilities' },
            { id: 'referrals', label: 'Referrals' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onNavigate(tab.id);
                setShowMobileMenu(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all block ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {user.role === 'admin' && (
            <button
              onClick={() => {
                onNavigate('admin');
                setShowMobileMenu(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-100/50 flex items-center gap-1.5 transition-all`}
            >
              <ShieldCheck className="w-4 h-4" /> Admin Controls
            </button>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block truncate max-w-44">{user.fullName || user.email}</span>
              <span className="text-[10px] text-slate-400 truncate block">{user.email}</span>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
