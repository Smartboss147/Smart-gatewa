export interface DbUser {
  id: number;
  uid: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  walletBalance: number; // in Kobo
  referralCode: string;
  referredBy: string | null;
  referralEarnings: number; // in Kobo
  createdAt: string;
}

export interface DbTransaction {
  id: number;
  userId: number;
  type: 'wallet_funding' | 'airtime' | 'data' | 'electricity' | 'cable' | 'referral_bonus' | 'admin_credit' | 'admin_debit';
  amount: number; // in Kobo
  status: 'pending' | 'success' | 'failed';
  reference: string;
  provider: string | null;
  recipient: string | null;
  details: string;
  createdAt: string;
}

export interface DbNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AirtimeFormData {
  provider: 'MTN' | 'Airtel' | 'Glo' | '9mobile';
  phone: string;
  amount: number;
}

export interface DataFormData {
  provider: 'MTN' | 'Airtel' | 'Glo' | '9mobile';
  phone: string;
  planId: string;
  planName: string;
  price: number;
}

export interface ElectricityFormData {
  provider: string; // 'IKEDC' | 'EKEDC' | 'AEDC' | etc
  meterNumber: string;
  meterType: 'prepaid' | 'postpaid';
  amount: number;
}

export interface CableFormData {
  provider: 'DSTV' | 'GOtv' | 'Startimes';
  smartcardNumber: string;
  planId: string;
  planName: string;
  price: number;
}
