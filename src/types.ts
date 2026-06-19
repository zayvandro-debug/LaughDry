/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'karyawan';
  email: string;
  username: string;
  branchId: string;
  password?: string;
  permissions?: string[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

export interface Service {
  id: string;
  name: string;
  category: 'kiloan' | 'satuan';
  price: number;
  unit: string; // 'kg' for kiloan, 'pcs' / 'sheet' etc. for satuan
  estimateHours: number; // Janji penyelesaian (contoh: 48 jam untuk reguler, 6 jam ekspres)
  isActive: boolean;
  workflowSteps?: string[]; // Custom workflow steps, e.g. ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai']
  promiseName?: string; // e.g. 'Reguler' or 'Cepat'
  promiseDurationText?: string; // e.g. '4 hari' or '12 jam'
}

export interface Customer {
  id: string;
  name: string;
  phone: string; // Used for Link Tracking WhatsApp
  address: string;
  depositBalance: number;
  loyaltyPoints: number;
  createdAt: string;
  lastActive: string;
}

export enum OrderStatus {
  ANTRI = 'Antri',
  DICUCI = 'Dicuci',
  DISETRIKA_DILIPAT = 'Disetrika/Dilipat',
  DIKEMAS = 'Dikemas',
  SIAP_DIAMBIL = 'Siap Diambil',
  SELESAI = 'Selesai',
  DIBATALKAN = 'Dibatalkan',
}

export interface OrderItem {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  quantity: number; // berat (kg) atau jumlah (pcs)
  subtotal: number;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer' | 'Deposit';
  paymentStatus: 'Lunas' | 'Belum Lunas';
  status: OrderStatus;
  notes: string;
  clothesCount?: number;
  rating?: number;
  feedback?: string;
  createdAt: string; // timestamp ISO
  updatedAt: string; // timestamp ISO
  estimatedCompletion: string; // timestamp ISO
  completedAt?: string; // timestamp ISO
  paymentDate?: string; // timestamp ISO
  pointsEarned: number;
  pointsRedeemed?: number;
  perfume?: string;
  cashierId?: string;
  cashierName?: string;
  isImported?: boolean;
}

export type ExpenseCategory =
  | 'Gaji'
  | 'Listrik'
  | 'Air'
  | 'Sewa'
  | 'Perlengkapan'
  | 'Detergen/Softener'
  | 'Transportasi'
  | 'Maintenance'
  | 'Gas'
  | 'Lainnya';

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  branchId: string;
  date: string; // ISO string
  recordedBy: string; // User ID / name
  paymentMethod?: 'Cash' | 'QRIS' | string;
}

export interface DepositMutation {
  id: string;
  customerId: string;
  customerName: string;
  type: 'top_up' | 'use';
  amount: number;
  balanceAfter: number;
  date: string;
  invoiceReference?: string; // If used for paying an invoice
}

export interface LoyaltyPointMutation {
  id: string;
  customerId: string;
  customerName: string;
  type: 'add' | 'redeem';
  points: number;
  pointsAfter: number;
  date: string;
  invoiceReference?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'nota_layanan' | 'siap_diambil' | 'promo';
  body: string;
}

export interface SystemSettings {
  logoUrl: string;
  pointsMultiplier: number; // e.g., 1 point per 10,005 IDR spent
  pointsValue: number; // e.g., 1 point = 100 IDR discount contribution
  bluetoothPrinterAddress: string;
  showNotesInReceipt?: boolean;
  showPointsInReceipt?: boolean;
  showBranchPhone?: boolean;
  showEstimatedCompletion?: boolean;
  showCustomerPhoneInReceipt?: boolean;
  showCashierNameInReceipt?: boolean;
  showTermsInReceipt?: boolean;
  showLogoInReceipt?: boolean;
  showHeaderLogoInReceipt?: boolean;
  receiptFontSize?: 'small' | 'medium' | 'large';
  receiptAlignment?: 'left' | 'center';
  customReceiptHeader?: string;
  customReceiptFooter?: string;
  customReceiptLogo?: string;
  customReceiptLogoImg?: string;
  customReceiptHeaderLogoImg?: string;
  customReceiptPromo?: string;
  receiptElements?: ReceiptElementStyle[];
  // QRIS fields
  qrisType?: 'none' | 'static' | 'dynamic';
  qrisMerchantId?: string;
  qrisStaticQrUrl?: string;
  vercelTrackingUrl?: string;
  accentColor?: string;
}

export interface SettingsVersion {
  id: string;
  timestamp: string;
  description: string;
  settings: SystemSettings;
}

export interface ReceiptElementStyle {
  id: string; // e.g., 'header', 'phone', 'invoice', 'date', 'customer', 'custPhone', 'cashier', 'status', 'estimate', 'items', 'total', 'paidState', 'points', 'notes', 'footer', 'logo'
  label: string;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  isBold: boolean;
  isVisible: boolean;
  showPrefix?: boolean; // True by default. If false, prefix (e.g. "Cust:") is hidden
  isItalic?: boolean;   // Support italic stylized font modifier
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  branchId: string;
  checkIn: string; // ISO date-time string
  checkOut?: string; // Optional ISO date-time string
  workDuration?: number; // Minutes
  status: 'Hadir' | 'Selesai' | 'Ditolak';
  notes?: string;
  latLong?: string; // Optional coordinates for simulation realism
  photoUrl?: string; // Base64 or mock image representation of selfie photo
  startingCashDrawer?: number; // Starting cash input at check-in
  endingCashDrawerInput?: number; // Physical cash input at checkout
  expectedCashBalance?: number; // Calculated cash balance expected by system
  cashDifference?: number; // variance (endingCashDrawerInput - expectedCashBalance)
  reconciliationNotes?: string; // Reason for cash drawer differences
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO timestamp
  invoiceNumber?: string;
  amount?: number;
  cashierName?: string;
  isRead: boolean;
}



