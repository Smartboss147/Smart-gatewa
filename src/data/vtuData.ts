export interface DataPlan {
  id: string;
  name: string;
  price: number; // in Naira
  validity: string;
}

export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'mtn_1', name: '1GB SME', price: 290, validity: '30 Days' },
    { id: 'mtn_2', name: '2GB SME', price: 580, validity: '30 Days' },
    { id: 'mtn_3', name: '5GB SME', price: 1450, validity: '30 Days' },
    { id: 'mtn_4', name: '10GB Gifting', price: 3100, validity: '30 Days' },
    { id: 'mtn_5', name: '20GB Gifting', price: 5900, validity: '30 Days' },
  ],
  Airtel: [
    { id: 'airtel_1', name: '1GB CG', price: 280, validity: '30 Days' },
    { id: 'airtel_2', name: '2GB CG', price: 560, validity: '30 Days' },
    { id: 'airtel_3', name: '5GB CG', price: 1400, validity: '30 Days' },
    { id: 'airtel_4', name: '15GB Gifting', price: 4200, validity: '30 Days' },
  ],
  Glo: [
    { id: 'glo_1', name: '1.25GB Gifting', price: 450, validity: '14 Days' },
    { id: 'glo_2', name: '2.5GB CG', price: 850, validity: '30 Days' },
    { id: 'glo_3', name: '5.8GB CG', price: 1750, validity: '30 Days' },
    { id: 'glo_4', name: '12GB Gifting', price: 3500, validity: '30 Days' },
  ],
  '9mobile': [
    { id: '9mobile_1', name: '1GB Gifting', price: 400, validity: '30 Days' },
    { id: '9mobile_2', name: '3GB Gifting', price: 1100, validity: '30 Days' },
    { id: '9mobile_3', name: '5GB Gifting', price: 1800, validity: '30 Days' },
  ],
};

export interface CableBouquet {
  id: string;
  name: string;
  price: number; // in Naira
}

export const CABLE_BOUQUETS: Record<string, CableBouquet[]> = {
  DSTV: [
    { id: 'dstv_padi', name: 'DSTV Padi', price: 3600 },
    { id: 'dstv_yanga', name: 'DSTV Yanga', price: 5100 },
    { id: 'dstv_confam', name: 'DSTV Confam', price: 9300 },
    { id: 'dstv_compact', name: 'DSTV Compact', price: 15700 },
    { id: 'dstv_compact_plus', name: 'DSTV Compact Plus', price: 25000 },
    { id: 'dstv_premium', name: 'DSTV Premium', price: 37000 },
  ],
  GOtv: [
    { id: 'gotv_lite', name: 'GOtv Lite', price: 1300 },
    { id: 'gotv_value', name: 'GOtv Value', price: 2800 },
    { id: 'gotv_plus', name: 'GOtv Plus', price: 4400 },
    { id: 'gotv_max', name: 'GOtv Max', price: 6500 },
    { id: 'gotv_supa', name: 'GOtv Supa', price: 9600 },
  ],
  Startimes: [
    { id: 'st_nova', name: 'Nova Bouquet', price: 1500 },
    { id: 'st_basic', name: 'Basic Bouquet', price: 3000 },
    { id: 'st_smart', name: 'Smart Bouquet', price: 4500 },
    { id: 'st_classic', name: 'Classic Bouquet', price: 6000 },
    { id: 'st_super', name: 'Super Bouquet', price: 9000 },
  ],
};

export interface DiscoCompany {
  code: string;
  name: string;
}

export const DISCO_COMPANIES: DiscoCompany[] = [
  { code: 'IKEDC', name: 'Ikeja Electricity Distribution Company (IKEDC)' },
  { code: 'EKEDC', name: 'Eko Electricity Distribution Company (EKEDC)' },
  { code: 'AEDC', name: 'Abuja Electricity Distribution Company (AEDC)' },
  { code: 'KEDCO', name: 'Kano Electricity Distribution Company (KEDCO)' },
  { code: 'PHED', name: 'Port Harcourt Electricity Distribution Company (PHED)' },
  { code: 'JED', name: 'Jos Electricity Distribution Company (JED)' },
  { code: 'IBEDC', name: 'Ibadan Electricity Distribution Company (IBEDC)' },
  { code: 'KAEDCO', name: 'Kaduna Electricity Distribution Company (KAEDCO)' },
];
