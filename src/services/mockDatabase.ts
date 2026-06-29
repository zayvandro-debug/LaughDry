/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Branch,
  Service,
  Customer,
  Order,
  OrderStatus,
  Expense,
  DepositMutation,
  LoyaltyPointMutation,
  AuditLog,
  WhatsAppTemplate,
  SystemSettings,
  SettingsVersion,
  AttendanceRecord,
} from '../types';
import { LaundryService } from '../services/laundryService';
import { db, auth, setFirebaseQuotaExceeded, collection, doc, onSnapshot } from '../lib/firebase';
import logoImg from '../assets/images/logo_laughdry_1781839107009.jpg';

// Let's seed with rich initial data that demonstrates the platform's features instantly.
const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Andi Owner', role: 'owner', email: 'owner@laughdry.co.id', username: 'owner', branchId: 'br-1', password: 'owner' }
];

const INITIAL_BRANCHES: Branch[] = [
  { id: 'br-1', name: 'Cabang Utama', address: 'Jl. Utama Laundry No. 1', phone: '081234567890', latitude: -6.273, longitude: 106.726 }
];

const INITIAL_SERVICES: Service[] = [
  { id: 'srv-1', name: 'Cuci Setrika', category: 'kiloan', price: 8000, unit: 'kg', estimateHours: 48, isActive: true, workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'], promiseName: 'Reguler', promiseDurationText: '2 Hari' },
  { id: 'srv-2', name: 'Cuci Setrika', category: 'kiloan', price: 15000, unit: 'kg', estimateHours: 6, isActive: true, workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'], promiseName: 'Express', promiseDurationText: '6 Jam' },
  { id: 'srv-5', name: 'Jas / Tuxedo', category: 'satuan', price: 45000, unit: 'pcs', estimateHours: 72, isActive: true, workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'], promiseName: 'Reguler', promiseDurationText: '3 Hari' },
  { id: 'srv-6', name: 'Bed Cover Large', category: 'satuan', price: 35000, unit: 'pcs', estimateHours: 48, isActive: true, workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'], promiseName: 'Reguler', promiseDurationText: '2 Hari' },
  { id: 'srv-8', name: 'Premium Shoes Wash', category: 'satuan', price: 50000, unit: 'pcs', estimateHours: 96, isActive: true, workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'], promiseName: 'Reguler', promiseDurationText: '4 Hari' }
];

const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_ORDERS: Order[] = [];

const INITIAL_EXPENSES: Expense[] = [];

const INITIAL_DEPOSITS: DepositMutation[] = [];

const INITIAL_LOYALTY: LoyaltyPointMutation[] = [];

const INITIAL_AUDIT: AuditLog[] = [];

const INITIAL_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Nota Layanan Baru',
    category: 'nota_layanan',
    body: `Halo Kak *{{customer_name}}*, terima kasih telah memesan layanan di *Laundry Kita*! 😊
Berikut rincian nota Anda:
📌 No. Nota: *{{invoice_number}}*
🧺 Layanan: *{{services_list}}*
⚖️ Berat / Jumlah: *{{total_quantity}}*
🌸 Pilihan Aroma: *{{perfume}}*
💰 Total Biaya: *{{total_amount}}*
💳 Pembayaran: *{{payment_method}}* ({{payment_status}})
🕒 Estimasi Selesai: *{{estimated_completion}}*

Pantau cucian Kakak secara real-time langsung melalui tautan di bawah ini:
🔗 {{tracking_url}}

Hormat kami,
*Laundry Kita*`
  },
  {
    id: 'tmpl-2',
    name: 'Laundry Siap Diambil',
    category: 'siap_diambil',
    body: `Kabar gembira Kak *{{customer_name}}*! 🎉

Cucian ceria Kakak untuk nota *{{invoice_number}}* telah SELESAI diproses dengan standar kebersihan paripurna kami.
Sudah rapi, wangi, higienis, aroma *{{perfume}}* dan dikemas dengan aman. ✨

Silakan datang mengambilnya di outlet kami:
📍 *{{branch_name}}*
🏢 Alamat: {{branch_address}}
📱 Sisa Tagihan: *{{payment_due}}*

Terima kasih telah mempercayakan laundry Kakak bersama kami!
🔥 *Jangan lupa tunjukkan link tracking atau halaman invoice untuk pengambilan ya!*`
  },
  {
    id: 'tmpl-3',
    name: 'Promo Bulanan Spesial',
    category: 'promo',
    body: `Halo Sahabat Setia *Laundry Kita*! 🌟

Jangan biarkan pakaian kotor menumpuk di musim hujan ini! Dapatkan *Cahback 20% Deposit / Potongan Rp 15.000* untuk laundry satuan khusus bed cover, jas mewah, dan sepatu premium!

💳 Saldo Deposit Anda saat ini: *{{deposit_balance}}*
⭐ Loyalty Coins Anda saat ini: *{{loyalty_points}}* Coins

Pakai kode promo: *BERSIHMANTAP* saat transaksi di kasir kesayangan Kakak!
Promo berlaku hingga akhir bulan ini.`
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

const INITIAL_SETTINGS: SystemSettings = {
  logoUrl: logoImg,
  pointsMultiplier: 10000, // 1 point per 10,000 IDR
  pointsValue: 100, // 1 point = 100 IDR discount
  bluetoothPrinterAddress: 'CC:3F:1D:9B:D2:4E (Thermal POS-58)',
  branchPhone: '0812-3456-7890',
  vercelTrackingUrl: 'https://laughdry.vercel.app',
  accentColor: '#3b82f6', // Default brand blue
  showNotesInReceipt: true,
  showPointsInReceipt: true,
  showBranchPhone: true,
  showEstimatedCompletion: true,
  showCustomerPhoneInReceipt: true,
  showCashierNameInReceipt: true,
  showTermsInReceipt: true,
  showLogoInReceipt: true,
  showHeaderLogoInReceipt: true,
  receiptFontSize: 'medium',
  receiptAlignment: 'center',
  customReceiptHeader: 'LAUGHDRY EXPRESS\nLAUNDRY KILOAN & SATUAN BINTARO',
  customReceiptHeaderLogoImg: logoImg,
  customReceiptFooter: 'TERIMA KASIH ATAS KUNJUNGAN ANDA!\nSIMPAN STRUK INI SEBAGAI PENJAMIN',
  receiptElements: [
    { id: 'outlet_name', label: 'Nama Outlet / Cabang', fontSize: 13, alignment: 'center', isBold: true, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'invoice_number', label: 'Nomor Nota Transaksi', fontSize: 11, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'customer_name', label: 'Nama Lengkap Pelanggan', fontSize: 13, alignment: 'left', isBold: true, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'customer_phone', label: 'Nomor HP Pelanggan', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'order_date', label: 'Tanggal Transaksi', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'cashier_info', label: 'Informasi Kasir', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'order_status', label: 'Status Pembayaran', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'estimated_time', label: 'Estimasi Ambil Cucian', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'perfume_fragrance', label: 'Aroma Parfum Terpilih', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'item_list', label: 'Daftar Cucian & Harga', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'total_charge', label: 'Total Tagihan Biaya', fontSize: 12, alignment: 'right', isBold: true, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: true, spacing: 4 },
    { id: 'member_points', label: 'Poin Member', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'footer_terms', label: 'Catatan & Ucapan Terima Kasih', fontSize: 9, alignment: 'center', isBold: false, isVisible: true, showPrefix: true, isItalic: false, isVisibleInti: false, spacing: 4 },
    { id: 'whatsapp_template', label: 'Pesan WA Template / CRM', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: true, isVisibleInti: false, spacing: 4 }
  ],
  qrisType: 'static',
  qrisMerchantId: 'ID1020304050607',
  qrisStaticQrUrl: ''
};

const INITIAL_SETTINGS_HISTORY: SettingsVersion[] = [
  {
    id: 'ver-1',
    timestamp: '2026-06-01T08:00:00Z',
    description: 'Konfigurasi Awal Default Sektor 9',
    settings: { ...INITIAL_SETTINGS }
  },
  {
    id: 'ver-2',
    timestamp: '2026-06-03T14:20:00Z',
    description: 'Nota Promo Idul Adha (Teks Footer Kustom)',
    settings: {
      ...INITIAL_SETTINGS,
      customReceiptPromo: 'DISKON RAMADHAN 15% - KODE: BERKAH',
      customReceiptFooter: 'KASIH INFO KELUARGA YA KAK!\nSIMPAN SEBAGAI KUPON DI NEXT ORDER'
    }
  }
];

export class LaughDryDatabase {
  private static loadKey<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(`laughdry_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  private static saveKey<T>(key: string, value: T): void {
    localStorage.setItem(`laughdry_${key}`, JSON.stringify(value));
  }

  /**
   * [FIX] Buat tracking URL yang menyertakan ?owner=UID agar pelanggan yang membuka link
   * dapat membaca database owner yang benar dari Firestore tanpa perlu login.
   * Format: https://domain.vercel.app?owner=UID&phone=08xxx&invoice=INV-001
   */
  public static getTrackingUrl(phone: string, invoiceNumber?: string): string {
    const settings = this.getSettings();
    const baseUrl = settings.vercelTrackingUrl?.trim() || '';
    if (!baseUrl) return '';

    // Ambil owner UID dari Firebase Auth atau localStorage (auth sudah diimport di file ini)
    const ownerUid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid') || '';

    try {
      const url = new URL(baseUrl);
      if (ownerUid) url.searchParams.set('owner', ownerUid);
      if (phone) url.searchParams.set('phone', phone);
      if (invoiceNumber) url.searchParams.set('invoice', invoiceNumber);
      return url.toString();
    } catch (e) {
      return baseUrl;
    }
  }

  // Validation layer to verify database integrity during Firebase raw synchronization
  public static isValidUser(u: any): boolean {
    return !!(u && typeof u === 'object' && u.id && u.name && u.role && u.email && u.username && u.branchId);
  }
  public static isValidBranch(b: any): boolean {
    return !!(b && typeof b === 'object' && b.id && b.name && b.address && b.phone);
  }
  public static isValidService(s: any): boolean {
    return !!(s && typeof s === 'object' && s.id && s.name && s.category && typeof s.price === 'number' && s.unit);
  }
  public static isValidCustomer(c: any): boolean {
    return !!(c && typeof c === 'object' && c.id && c.name && c.phone);
  }
  public static isValidOrder(o: any): boolean {
    return !!(o && typeof o === 'object' && o.id && o.invoiceNumber && o.customerId && o.customerName && Array.isArray(o.items) && typeof o.totalAmount === 'number' && o.status);
  }
  public static isValidExpense(e: any): boolean {
    return !!(e && typeof e === 'object' && e.id && e.description && e.category && typeof e.amount === 'number' && e.branchId);
  }
  public static isValidSettings(s: any): boolean {
    return !!(s && typeof s === 'object' && typeof s.pointsMultiplier === 'number' && typeof s.pointsValue === 'number' && s.bluetoothPrinterAddress);
  }
  public static isValidPerfume(p: any): boolean {
    return !!(p && typeof p === 'object' && p.id && p.name && (p.isActive === true || p.isActive === false));
  }
  public static isValidAttendance(a: any): boolean {
    return !!(a && typeof a === 'object' && a.id && a.userId && a.userName && a.branchId && a.checkIn && a.status);
  }

  public static isFirebaseQuotaExceeded(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const quotaTS = localStorage.getItem('laughdry_firebase_quota_exceeded_timestamp');
    if (quotaTS) {
      const elapsed = Date.now() - parseInt(quotaTS, 10);
      if (elapsed < 10800000) { // 3 hours
        return true;
      } else {
        localStorage.removeItem('laughdry_firebase_quota_exceeded_timestamp');
      }
    }
    return false;
  }

  // Firestore Synchronization static helper
  public static async syncFromFirestore(): Promise<void> {
    if (this.isFirebaseQuotaExceeded()) {
      console.log('Firebase quota is currently exceeded, skipping syncFromFirestore.');
      return;
    }
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      console.log('Firebase is disabled, skipping syncFromFirestore.');
      return;
    }
    // [FIX] Cek uid dari auth ATAU dari ?owner= di URL (mode tracking pelanggan tanpa login)
    const isClient = typeof window !== 'undefined';
    const queryParams = isClient ? new URLSearchParams(window.location.search) : null;
    const ownerParamUid = queryParams?.get('owner')?.trim() || null;

    const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid') || ownerParamUid;
    if (!uid) {
      console.log('No authenticated user, skipping syncFromFirestore.');
      return;
    }
    // Simpan uid ke localStorage agar fungsi-fungsi lain yang masih menggunakannya tetap berjalan
    if (auth.currentUser?.uid) {
      localStorage.setItem('laughdry_firebase_uid', auth.currentUser.uid);
    } else if (ownerParamUid) {
      // Mode pelanggan: simpan owner UID dari URL agar LaundryService membaca database yang benar
      localStorage.setItem('laughdry_firebase_uid', ownerParamUid);
    }

    // Check if we are in customer-only / guest tracking mode
    const isCustomerOnlyMode = isClient && (
      window.location.hostname.includes('vercel.app') || 
      queryParams?.has('phone') || 
      queryParams?.has('invoice') ||
      ownerParamUid !== null
    );
    const isGuest = !auth.currentUser;

    try {
      localStorage.setItem('laughdry_skip_demo_seeds', 'true');

      if (isCustomerOnlyMode || isGuest) {
        console.log('Customer-only / Guest mode detected. Syncing only tracking data.');
        
        // 1. Sync Settings
        try {
          const firestoreSettings = await LaundryService.getSettings();
          if (firestoreSettings && this.isValidSettings(firestoreSettings)) {
            this.saveKey('settings', firestoreSettings);
          }
        } catch (e) {
          console.warn("Failed syncing settings:", e);
        }

        // 2. Sync Branches
        try {
          const firestoreBranches = await LaundryService.getBranches();
          if (firestoreBranches.length > 0) {
            this.saveKey('branches', firestoreBranches);
          }
        } catch (e) {
          console.warn("Failed syncing branches:", e);
        }

        // 3. Sync Perfumes
        try {
          const firestorePerfumes = await LaundryService.getPerfumes();
          if (firestorePerfumes.length > 0) {
            this.saveKey('perfumes', firestorePerfumes);
          }
        } catch (e) {
          console.warn("Failed syncing perfumes:", e);
        }

        // 4. Sync Services
        try {
          const firestoreServices = await LaundryService.getServices();
          if (firestoreServices.length > 0) {
            this.saveKey('services', firestoreServices);
          }
        } catch (e) {
          console.warn("Failed syncing services:", e);
        }

        // 5. Sync orders matching the invoice or phone from URL
        const invoiceNum = queryParams?.get('invoice');
        const phoneNum = queryParams?.get('phone');

        if (invoiceNum) {
          // Mode detail: cari order berdasarkan invoice number spesifik
          try {
            const trackingOrder = await LaundryService.getOrderByInvoiceAndPhone(invoiceNum, phoneNum || '');
            if (trackingOrder) {
              // Merge into existing local orders
              const localOrders = this.getOrders().filter(o => o.id !== trackingOrder.id);
              this.saveKey('orders', [trackingOrder, ...localOrders]);
              
              // Also sync customer profile for this tracking order
              if (trackingOrder.customerId) {
                const customer = await LaundryService.getCustomerById(trackingOrder.customerId);
                if (customer) {
                  const localCusts = this.getCustomers().filter(c => c.id !== customer.id);
                  this.saveKey('customers', [customer, ...localCusts]);
                }
              }
            }
          } catch (e) {
            console.warn("Failed syncing tracking order by invoice:", e);
          }
        } else if (phoneNum) {
          // [FIX] Mode "Lacak Sekarang": cari semua order berdasarkan nomor HP pelanggan.
          // Ini yang memungkinkan tombol "Lacak Sekarang" berfungsi saat user input nomor HP
          // tanpa ada invoice tertentu di URL.
          try {
            const phoneOrders = await LaundryService.getOrdersByPhone(phoneNum);
            if (phoneOrders.length > 0) {
              // Merge semua order pelanggan ini ke local storage
              const existingIds = new Set(phoneOrders.map(o => o.id));
              const localOrders = this.getOrders().filter(o => !existingIds.has(o.id));
              this.saveKey('orders', [...phoneOrders, ...localOrders]);
              
              // Sync customer profile dari order terbaru
              const latestOrder = phoneOrders[0];
              if (latestOrder.customerId) {
                try {
                  const customer = await LaundryService.getCustomerById(latestOrder.customerId);
                  if (customer) {
                    const localCusts = this.getCustomers().filter(c => c.id !== customer.id);
                    this.saveKey('customers', [customer, ...localCusts]);
                  }
                } catch (e) {
                  console.warn("Failed syncing customer for phone order:", e);
                }
              }
            }
          } catch (e) {
            console.warn("Failed syncing tracking orders by phone:", e);
          }
        }

        window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        return;
      }

      // 0. Users (Owner & Kasir)
      try {
        const firestoreUsers = await LaundryService.getFirestoreUsers();
        const validUsers = firestoreUsers.filter(u => this.isValidUser(u));
        if (validUsers.length > 0) {
          this.saveKey('users', validUsers);
        } else {
          const localUsers = this.getUsers().filter(u => this.isValidUser(u));
          const finalUsers = localUsers.length > 0 ? localUsers : INITIAL_USERS;
          this.saveKey('users', finalUsers);
          try {
            for (const u of finalUsers) {
              await LaundryService.saveFirestoreUser(u);
            }
          } catch (e) {
            console.warn("Could not save initial users to Firestore:", e);
          }
        }
      } catch (err) {
        console.warn("Failed syncing users step:", err);
      }

      // 1. Branches
      try {
        const firestoreBranches = await LaundryService.getBranches();
        const validBranches = firestoreBranches.filter(b => this.isValidBranch(b));
        if (validBranches.length > 0) {
          this.saveKey('branches', validBranches);
        } else {
          const localBranches = this.getBranches().filter(b => this.isValidBranch(b));
          const finalBranches = localBranches.length > 0 ? localBranches : INITIAL_BRANCHES;
          this.saveKey('branches', finalBranches);
          try {
            for (const b of finalBranches) {
              await LaundryService.saveBranch(b);
            }
          } catch (e) {
            console.warn("Could not save initial branches to Firestore:", e);
          }
        }
      } catch (err) {
        console.warn("Failed syncing branches step:", err);
      }

      // 2. Services
      try {
        const firestoreServices = await LaundryService.getServices();
        const validServices = firestoreServices.filter(s => this.isValidService(s));
        if (validServices.length > 0) {
          this.saveKey('services', validServices);
        } else {
          const localServices = this.getServices().filter(s => this.isValidService(s));
          const finalServices = localServices.length > 0 ? localServices : INITIAL_SERVICES;
          this.saveKey('services', finalServices);
          try {
            for (const s of finalServices) {
              await LaundryService.saveService(s);
            }
          } catch (e) {
            console.warn("Could not save initial services to Firestore:", e);
          }
        }
      } catch (err) {
        console.warn("Failed syncing services step:", err);
      }

      // 3. Customers
      try {
        const customers = await LaundryService.getCustomers();
        const validCustomers = customers.filter(c => this.isValidCustomer(c));
        this.saveKey('customers', validCustomers);
      } catch (err) {
        console.warn("Failed syncing customers step:", err);
      }

      // 4. Orders
      try {
        const orders = await LaundryService.getOrders();
        const validOrders = orders.filter(o => this.isValidOrder(o));
        this.saveKey('orders', validOrders);
      } catch (err) {
        console.warn("Failed syncing orders step:", err);
      }

      // 5. Expenses
      try {
        const expenses = await LaundryService.getExpenses();
        const validExpenses = expenses.filter(e => this.isValidExpense(e));
        this.saveKey('expenses', validExpenses);
      } catch (err) {
        console.warn("Failed syncing expenses step:", err);
      }

      // 6. Settings
      try {
        const firestoreSettings = await LaundryService.getSettings();
        const localSettings = this.loadKey('settings', null);

        if (firestoreSettings && this.isValidSettings(firestoreSettings)) {
          this.saveKey('settings', firestoreSettings);
        } else {
          const finalSettings = (localSettings && this.isValidSettings(localSettings)) ? localSettings : INITIAL_SETTINGS;
          this.saveKey('settings', finalSettings);
          try {
            await LaundryService.saveSettings(finalSettings);
          } catch (e) {
            console.warn("Could not save initial settings to Firestore:", e);
          }
        }
      } catch (err) {
        console.warn("Failed syncing settings step:", err);
      }

      // 7. Attendance
      try {
        const attendance = await LaundryService.getAttendanceRecords();
        const validAttendance = attendance.filter(a => this.isValidAttendance(a));
        this.saveKey('attendance', validAttendance);
      } catch (err) {
        console.warn("Failed syncing attendance step:", err);
      }

      // 8. Perfumes (parfume collection)
      try {
        const firestorePerfumes = await LaundryService.getPerfumes();
        const validPerfumes = firestorePerfumes.filter(p => this.isValidPerfume(p));
        if (validPerfumes.length > 0) {
          this.saveKey('perfumes', validPerfumes);
        } else {
          const localPerfumes = this.getPerfumes().filter(p => this.isValidPerfume(p));
          const finalPerfumes = localPerfumes.length > 0 ? localPerfumes : [
            { id: 'pf-1', name: 'Floral', description: 'Keharuman bunga akasia anggun yang indah', isActive: true, icon: '🌸' },
            { id: 'pf-2', name: 'Fresh', description: 'Wangi relaksasi segar pantai tropis', isActive: true, icon: '🥥' },
            { id: 'pf-3', name: 'Sweet', description: 'Aroma manis kental buah-buahan', isActive: true, icon: '🍓' },
            { id: 'pf-4', name: 'Woody', description: 'Keharuman maskulin alami yang menenangkan', isActive: true, icon: '🪵' }
          ];
          this.saveKey('perfumes', finalPerfumes);
          try {
            for (const p of finalPerfumes) {
              await LaundryService.savePerfume(p);
            }
          } catch (e) {
            console.warn("Could not save initial perfumes to Firestore:", e);
          }
        }
      } catch (err) {
        console.warn("Failed syncing perfumes step:", err);
      }

      // 9. Templates
      try {
        const firestoreTemplates = await LaundryService.getTemplates();
        if (firestoreTemplates.length > 0) {
          this.saveKey('templates', firestoreTemplates);
        } else {
          // If Firestore has no templates, sync the local ones up to Firestore
          const localTemplates = this.getTemplates();
          await LaundryService.saveTemplates(localTemplates);
        }
      } catch (e) {
        console.warn("Failed syncing templates:", e);
      }

      window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
    } catch (e) {
      console.error("Gagal sinkronasi awal Firestore:", e);
    }
  }

  // State elements
  public static getPerfumes(): any[] {
    return this.loadKey('perfumes', [
      { id: 'pf-1', name: 'Floral', description: 'Keharuman melati & kelopak bunga mawar anggun yang indah', isActive: true, icon: '🌸' },
      { id: 'pf-2', name: 'Fresh', description: 'Wangi relaksasi kelapa muda segar pantai tropis', isActive: true, icon: '🥥' },
      { id: 'pf-3', name: 'Sweet', description: 'Aroma manis kental buah stroberi segar kesukaan anak-anak', isActive: true, icon: '🍓' },
      { id: 'pf-4', name: 'Woody', description: 'Keharuman maskulin batang kayu alami yang menenangkan', isActive: true, icon: '🪵' }
    ]);
  }

  public static savePerfumes(data: any[]) {
    const previous = this.getPerfumes();
    this.saveKey('perfumes', data);
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('parfume' as any, 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('parfume' as any, 'delete', prevItem.id, null);
      }
    });
  }

  public static getUsers(): User[] { return this.loadKey('users', INITIAL_USERS); }
  public static saveUsers(data: User[]) { 
    const previous = this.getUsers();
    this.saveKey('users', data); 

    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('user', 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('user', 'delete', prevItem.id, null);
      }
    });
  }

  // Save helper that tries to execute Firestore write, or queues it if offline or failed
  public static async queueSync(
    type: 'order' | 'customer' | 'expense' | 'attendance' | 'branch' | 'service' | 'settings' | 'user' | 'parfume',
    action: 'save' | 'delete',
    payloadId: string,
    payload: any
  ): Promise<void> {
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      return;
    }
    // [FIX] Cek auth.currentUser langsung, bukan hanya localStorage
    const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid');
    if (!uid) {
      const pending = this.getPendingSyncs();
      const filtered = pending.filter(item => !(item.type === type && item.payloadId === payloadId && item.action === action));
      const newItem = {
        id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        action,
        payloadId,
        payload,
        timestamp: Date.now()
      };
      this.saveKey('pending_syncs', [...filtered, newItem]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('laughdry_sync_queue_updated'));
      }
      return;
    }
    try {
      if (navigator.onLine) {
        await this.executeSync(type, action, payloadId, payload);
        return; // Synchronized successfully
      }
    } catch (err) {
      console.warn(`Direct write failed for ${type} ${payloadId}, queuing for offline sync...`, err);
    }
    
    const pending = this.getPendingSyncs();
    const filtered = pending.filter(item => !(item.type === type && item.payloadId === payloadId && item.action === action));
    
    const newItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      payloadId,
      payload,
      timestamp: Date.now()
    };
    
    this.saveKey('pending_syncs', [...filtered, newItem]);
    
    // Fire off custom event for notification or ui update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('laughdry_sync_queue_updated'));
    }
  }

  private static async executeSync(
    type: string,
    action: 'save' | 'delete',
    payloadId: string,
    payload: any
  ): Promise<void> {
    if (action === 'delete') {
      if (type === 'order') await LaundryService.deleteOrder(payloadId);
      else if (type === 'customer') await LaundryService.deleteCustomer(payloadId);
      else if (type === 'expense') await LaundryService.deleteExpense(payloadId);
      else if (type === 'branch') await LaundryService.deleteBranch(payloadId);
      else if (type === 'service') await LaundryService.deleteService(payloadId);
      else if (type === 'user') await LaundryService.deleteFirestoreUser(payloadId);
      else if (type === 'parfume') await LaundryService.deletePerfume(payloadId);
    } else {
      if (type === 'order') await LaundryService.addOrder(payload);
      else if (type === 'customer') await LaundryService.saveCustomer(payload);
      else if (type === 'expense') await LaundryService.saveExpense(payload);
      else if (type === 'branch') await LaundryService.saveBranch(payload);
      else if (type === 'service') await LaundryService.saveService(payload);
      else if (type === 'attendance') await LaundryService.saveAttendanceRecord(payload);
      else if (type === 'settings') await LaundryService.saveSettings(payload);
      else if (type === 'user') await LaundryService.saveFirestoreUser(payload);
      else if (type === 'parfume') await LaundryService.savePerfume(payload);
    }
  }

  private static isSyncingPending = false;

  public static async processPendingSyncs(): Promise<number> {
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      return 0;
    }
    // [FIX] Cek auth.currentUser langsung agar pending syncs diproses segera setelah login
    const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid');
    if (!uid) {
      return 0;
    }
    if (this.isSyncingPending) return 0;
    const pending = this.getPendingSyncs();
    if (pending.length === 0) return 0;
    
    if (!navigator.onLine) {
      return 0;
    }
    
    this.isSyncingPending = true;
    const remaining: any[] = [];
    let successCount = 0;
    
    for (const item of pending) {
      try {
        await this.executeSync(item.type, item.action, item.payloadId, item.payload);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync pending ${item.type} (${item.payloadId})`, err);
        remaining.push(item);

        const errMsg = (err?.message || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
          setFirebaseQuotaExceeded();
          
          // Break immediately and push all remaining unattempted items back into the queue
          const currentIndex = pending.indexOf(item);
          if (currentIndex !== -1) {
            for (let i = currentIndex + 1; i < pending.length; i++) {
              remaining.push(pending[i]);
            }
          }
          break;
        }
      }
    }
    
    this.saveKey('pending_syncs', remaining);
    this.isSyncingPending = false;
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('laughdry_sync_queue_updated'));
    }
    
    return successCount;
  }
  
  public static getPendingSyncs(): any[] {
    return this.loadKey('pending_syncs', []);
  }

  public static getBranches(): Branch[] { return this.loadKey('branches', INITIAL_BRANCHES); }
  public static saveBranches(data: Branch[]) { 
    const previous = this.getBranches();
    this.saveKey('branches', data); 
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('branch', 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('branch', 'delete', prevItem.id, null);
      }
    });
  }

  public static getServices(): Service[] { return this.loadKey('services', INITIAL_SERVICES); }
  public static saveServices(data: Service[]) { 
    const previous = this.getServices();
    this.saveKey('services', data); 
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('service', 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('service', 'delete', prevItem.id, null);
      }
    });
  }

  public static getCustomers(): Customer[] { return this.loadKey('customers', INITIAL_CUSTOMERS); }
  public static saveCustomers(data: Customer[]) { 
    const previous = this.getCustomers();
    // Ensure all loyaltyPoints are valid numeric values before saving to Database
    const validatedData = data.map(c => {
      const parsedPoints = Number(c.loyaltyPoints);
      return {
        ...c,
        loyaltyPoints: isNaN(parsedPoints) ? 0 : parsedPoints
      };
    });
    this.saveKey('customers', validatedData); 
    
    // Auto-update phone & name on existing orders if customer info has changed!
    // PERBAIKAN: Memperbarui nomor telepon pelanggan secara global pada semua riwayat transaksi aktif saat admin mengedit data pelanggan di CRM
    let ordersUpdated = false;
    const currentOrders = this.getOrders();
    const updatedOrders = currentOrders.map(order => {
      const matchCustomer = data.find(c => c.id === order.customerId);
      if (matchCustomer) {
        const isTransactionActive = order.status !== OrderStatus.SELESAI && order.status !== OrderStatus.DIBATALKAN;
        if (isTransactionActive && order.customerPhone !== matchCustomer.phone) {
          ordersUpdated = true;
          return {
            ...order,
            customerPhone: matchCustomer.phone,
            customerName: matchCustomer.name,
            updatedAt: new Date().toISOString()
          };
        } else if (order.customerName !== matchCustomer.name || order.customerPhone !== matchCustomer.phone) {
          // Tetap lakukan sinkronisasi standar untuk data name/phone non-aktif jika ada perubahan demi konsistensi data
          ordersUpdated = true;
          return {
            ...order,
            customerPhone: matchCustomer.phone,
            customerName: matchCustomer.name,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return order;
    });

    if (ordersUpdated) {
      // Save updated orders so they synchronise automatically to Firestore too!
      this.saveOrders(updatedOrders);
      // Dispatch custom event to notify React components to reload orders list
      window.dispatchEvent(new Event('laughdry_orders_updated'));
    }
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('customer', 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('customer', 'delete', prevItem.id, null);
      }
    });
  }

  public static getOrders(): Order[] { return this.loadKey('orders', INITIAL_ORDERS); }
  public static saveOrders(data: Order[]) { 
    const previous = this.getOrders();
    this.saveKey('orders', data); 
    
    // Dispatch event so UI components re-render immediately with new local data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('laughdry_orders_updated'));
    }

    // Differential Sync using QueueSync for network recovery
    // [FIX] queueSync dipanggil secara fire-and-forget (void) tapi dengan error handling
    // agar kegagalan Firestore tidak memblokir update UI lokal
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        // [FIX] Tambahkan field 'services' sebagai alias dari 'items' agar kompatibel
        // dengan Firestore Security Rules yang memeriksa 'data.services is list'
        const itemForSync = (item as any).items && !(item as any).services 
          ? { ...item, services: (item as any).items }
          : item;
        this.queueSync('order', 'save', item.id, itemForSync).catch(err => {
          console.warn(`[saveOrders] queueSync gagal untuk order ${item.id}:`, err);
        });
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('order', 'delete', prevItem.id, null).catch(err => {
          console.warn(`[saveOrders] queueSync delete gagal untuk order ${prevItem.id}:`, err);
        });
      }
    });
  }

  public static getExpenses(): Expense[] { return this.loadKey('expenses', INITIAL_EXPENSES); }
  public static saveExpenses(data: Expense[]) { 
    const previous = this.getExpenses();
    this.saveKey('expenses', data); 
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('expense', 'save', item.id, item);
      }
    });
    previous.forEach(prevItem => {
      const exists = data.some(d => d.id === prevItem.id);
      if (!exists) {
        this.queueSync('expense', 'delete', prevItem.id, null);
      }
    });
  }

  public static getDeposits(): DepositMutation[] { return this.loadKey('deposits', INITIAL_DEPOSITS); }
  public static saveDeposits(data: DepositMutation[]) { this.saveKey('deposits', data); }

  public static getLoyalty(): LoyaltyPointMutation[] { return this.loadKey('loyalty', INITIAL_LOYALTY); }
  public static saveLoyalty(data: LoyaltyPointMutation[]) { this.saveKey('loyalty', data); }

  public static getAuditLogs(): AuditLog[] { return this.loadKey('audit_logs', INITIAL_AUDIT); }
  public static saveAuditLogs(data: AuditLog[]) { this.saveKey('audit_logs', data); }

  public static getTemplates(): WhatsAppTemplate[] { return this.loadKey('templates', INITIAL_TEMPLATES); }
  public static saveTemplates(data: WhatsAppTemplate[]) { 
    this.saveKey('templates', data); 
    // Direct write to Firestore for instant synchronisation across devices
    if (localStorage.getItem('laughdry_firebase_disabled') !== 'true') {
      const uid = localStorage.getItem('laughdry_firebase_uid') || auth.currentUser?.uid;
      if (uid && uid !== 'default') {
        LaundryService.saveTemplates(data).catch(e => {
          console.error("Gagal menyimpan templates ke Firestore:", e);
        });
      }
    }
  }

  public static getAttendance(): AttendanceRecord[] { 
    const list = this.loadKey<AttendanceRecord[]>('attendance', INITIAL_ATTENDANCE); 
    return list.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }
  public static saveAttendance(data: AttendanceRecord[]) { 
    const previous = this.getAttendance();
    this.saveKey('attendance', data); 
    
    // Differential Sync using QueueSync for network recovery
    data.forEach(item => {
      const prevItem = previous.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        this.queueSync('attendance', 'save', item.id, item);
      }
    });
  }

  public static getSettings(): SystemSettings { 
    const isClient = typeof window !== 'undefined';
    const gateLogo = isClient ? localStorage.getItem('laughdry_gate_logo') : null;
    const defaultLogo = gateLogo || logoImg;

    INITIAL_SETTINGS.logoUrl = defaultLogo;
    INITIAL_SETTINGS.customReceiptHeaderLogoImg = defaultLogo;

    const settings = this.loadKey('settings', INITIAL_SETTINGS); 

    if (!settings.logoUrl || settings.logoUrl.includes('unsplash') || settings.logoUrl.includes('logo_laughdry_1781839107009')) {
      settings.logoUrl = defaultLogo;
    }
    if (!settings.customReceiptHeaderLogoImg || settings.customReceiptHeaderLogoImg.includes('unsplash') || settings.customReceiptHeaderLogoImg.includes('logo_laughdry_1781839107009')) {
      settings.customReceiptHeaderLogoImg = defaultLogo;
    }

    const hasNewEl = settings.receiptElements && settings.receiptElements.some(el => el.id === 'cashier_info');
    if (!settings.receiptElements || settings.receiptElements.length === 0 || !hasNewEl) {
      settings.receiptElements = INITIAL_SETTINGS.receiptElements;
      this.saveKey('settings', settings);
    }
    return settings; 
  }
  public static saveSettings(data: SystemSettings) { 
    this.saveKey('settings', data); 
    this.queueSync('settings', 'save', 'system', data);
    window.dispatchEvent(new CustomEvent('laughdry_settings_updated', { detail: data }));
  }

  public static getSettingsHistory(): SettingsVersion[] {
    return this.loadKey('settings_history', INITIAL_SETTINGS_HISTORY);
  }
  public static saveSettingsHistory(data: SettingsVersion[]) {
    this.saveKey('settings_history', data);
  }

  // Transaction Wrappers
  public static logActivity(userId: string, userName: string, role: string, action: string, details: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId,
      userName,
      role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.saveAuditLogs([newLog, ...logs]);
  }

  // Backup Sim
  public static generateBackupJSONString(): string {
    const backupContents = {
      users: this.getUsers(),
      branches: this.getBranches(),
      services: this.getServices(),
      customers: this.getCustomers(),
      orders: this.getOrders(),
      expenses: this.getExpenses(),
      deposits: this.getDeposits(),
      loyalty: this.getLoyalty(),
      audit_logs: this.getAuditLogs(),
      templates: this.getTemplates(),
      settings: this.getSettings(),
      version: "2026.1",
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(backupContents, null, 2);
  }

  public static restoreBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.users && data.branches && data.services && data.orders) {
        this.saveUsers(data.users);
        this.saveBranches(data.branches);
        this.saveServices(data.services);
        this.saveCustomers(data.customers || []);
        this.saveOrders(data.orders);
        this.saveExpenses(data.expenses || []);
        this.saveDeposits(data.deposits || []);
        this.saveLoyalty(data.loyalty || []);
        this.saveAuditLogs(data.audit_logs || []);
        if (data.templates) this.saveTemplates(data.templates);
        if (data.settings) this.saveSettings(data.settings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public static resetToSeed() {
    localStorage.removeItem('laughdry_users');
    localStorage.removeItem('laughdry_branches');
    localStorage.removeItem('laughdry_services');
    localStorage.removeItem('laughdry_customers');
    localStorage.removeItem('laughdry_orders');
    localStorage.removeItem('laughdry_expenses');
    localStorage.removeItem('laughdry_deposits');
    localStorage.removeItem('laughdry_loyalty');
    localStorage.removeItem('laughdry_audit_logs');
    localStorage.removeItem('laughdry_templates');
    localStorage.removeItem('laughdry_settings');
    localStorage.removeItem('laughdry_attendance');
  }

  public static async purgeAllDatabaseData(): Promise<void> {
    this.resetToSeed();
    this.saveKey('users', INITIAL_USERS);
    this.saveKey('branches', INITIAL_BRANCHES);
    this.saveKey('services', INITIAL_SERVICES);
    this.saveKey('customers', []);
    this.saveKey('orders', []);
    this.saveKey('expenses', []);
    this.saveKey('deposits', []);
    this.saveKey('loyalty', []);
    this.saveKey('attendance', []);
    this.saveKey('audit_logs', []);
    this.saveKey('settings', INITIAL_SETTINGS);
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      return;
    }
    try {
      localStorage.setItem('laughdry_skip_demo_seeds', 'true');
      
      // 1. Fetch and delete all orders
      const orders = await LaundryService.getOrders();
      for (const o of orders) {
        try { await LaundryService.deleteOrder(o.id); } catch (e) {}
      }
      
      // 2. Fetch and delete all customers
      const customers = await LaundryService.getCustomers();
      for (const c of customers) {
        try { await LaundryService.deleteCustomer(c.id); } catch (e) {}
      }
      
      // 3. Fetch and delete all expenses
      const expenses = await LaundryService.getExpenses();
      for (const e of expenses) {
        try { await LaundryService.deleteExpense(e.id); } catch (err) {}
      }
      
      // 4. Fetch and delete all attendance records
      const attendance = await LaundryService.getAttendanceRecords();
      for (const a of attendance) {
        try { await LaundryService.deleteAttendanceRecord(a.id); } catch (err) {}
      }
      
      // 5. Delete non-primary branches
      const branches = await LaundryService.getBranches();
      for (const b of branches) {
        if (b.id !== 'br-1') {
          try { await LaundryService.deleteBranch(b.id); } catch (e) {}
        }
      }
      
      // 6. Delete custom services
      const services = await LaundryService.getServices();
      const standardServiceIds = ['srv-1', 'srv-2', 'srv-5', 'srv-6', 'srv-8'];
      for (const s of services) {
        if (!standardServiceIds.includes(s.id)) {
          try { await LaundryService.deleteService(s.id); } catch (e) {}
        }
      }

      // 6.5. Delete custom users
      const usersToPurge = await LaundryService.getFirestoreUsers();
      for (const u of usersToPurge) {
        if (u.id !== 'usr-1') {
          try { await LaundryService.deleteFirestoreUser(u.id); } catch (e) {}
        }
      }

      // 7. Clear all local storage
      this.resetToSeed();
      
      // 8. Save clean defaults
      this.saveKey('users', INITIAL_USERS);
      this.saveKey('branches', INITIAL_BRANCHES);
      this.saveKey('services', INITIAL_SERVICES);
      this.saveKey('customers', []);
      this.saveKey('orders', []);
      this.saveKey('expenses', []);
      this.saveKey('deposits', []);
      this.saveKey('loyalty', []);
      this.saveKey('attendance', []);
      this.saveKey('audit_logs', []);
      
      await LaundryService.saveSettings(INITIAL_SETTINGS);
      this.saveKey('settings', INITIAL_SETTINGS);

    } catch (err) {
      console.error("Gagal melakukan pembersihan database:", err);
      throw err;
    }
  }

  private static unsubscribes: (() => void)[] = [];

  private static safeOnSnapshot(query: any, onNext: (snapshot: any) => void, onError: (error: any) => void): () => void {
    if (this.isFirebaseQuotaExceeded()) {
      return () => {};
    }
    try {
      return onSnapshot(query, onNext, (error) => {
        const errMsg = (error?.message || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
          setFirebaseQuotaExceeded();
        }
        onError(error);
      });
    } catch (e: any) {
      onError(e);
      return () => {};
    }
  }

  private static handleRealtimeError(error: any, moduleName: string) {
    console.error(`Realtime listener error - ${moduleName}:`, error);
    const errMsg = (error?.message || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('exhausted') || errMsg.includes('limit exceeded')) {
      setFirebaseQuotaExceeded();
      console.warn(`Stopping all realtime listeners due to Firebase daily quota exhaustion detected in ${moduleName}.`);
      this.stopRealtimeListeners();
      window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
    }
  }

  public static startRealtimeListeners(): void {
    if (this.isFirebaseQuotaExceeded()) {
      console.warn("Firebase quota is currently exceeded, skipping startRealtimeListeners.");
      return;
    }
    if (localStorage.getItem('laughdry_firebase_disabled') === 'true') {
      console.log('Firebase is disabled, skipping startRealtimeListeners.');
      return;
    }
    if (this.unsubscribes.length > 0) {
      return;
    }
    const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid');
    if (!uid) {
      console.warn("Unauthenticated. Skipping realtime listeners.");
      return;
    }
    const parent = `users_db/${uid}`;

    try {
      // 1. Listen to orders
      const unsubOrders = this.safeOnSnapshot(collection(db, parent, 'orders'), (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as Order);
        });
        const mockOrderIds = ['ord-1001', 'ord-1002', 'ord-1003', 'ord-1004', 'ord-1005'];
        const firestoreOrders = list.filter(o => !mockOrderIds.includes(o.id));
        
        // [FIX] Merge Firestore orders dengan local orders yang belum tersync.
        // Jangan replace seluruh list — itu akan menghapus order baru yang disimpan lokal
        // tapi belum sempat ditulis ke Firestore (race condition antara queueSync async
        // dan realtime snapshot yang datang lebih cepat dari write selesai).
        const currentLocal = this.loadKey<Order[]>('orders', []);
        const firestoreIds = new Set(firestoreOrders.map(o => o.id));
        // Simpan order lokal yang belum ada di Firestore (pending write)
        const pendingSyncIds = new Set(
          this.getPendingSyncs()
            .filter(s => s.type === 'order' && s.action === 'save')
            .map(s => s.payloadId)
        );
        const localOnlyOrders = currentLocal.filter(o => 
          !firestoreIds.has(o.id) && !mockOrderIds.includes(o.id)
        );
        // Gabung: Firestore orders (source of truth) + local-only orders (belum tersync)
        const mergedList = [...firestoreOrders, ...localOnlyOrders];
        
        if (JSON.stringify(currentLocal) !== JSON.stringify(mergedList)) {
          this.saveKey('orders', mergedList);
          window.dispatchEvent(new CustomEvent('laughdry_orders_updated'));
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "orders");
      });
      this.unsubscribes.push(unsubOrders);

      // 2. Listen to customers
      const unsubCustomers = this.safeOnSnapshot(collection(db, parent, 'customers'), (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as Customer);
        });
        const mockCustomerIds = ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5', 'cust-6', 'cust-7'];
        const cleanList = list.filter(c => !mockCustomerIds.includes(c.id));

        const currentLocal = this.loadKey<Customer[]>('customers', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(cleanList)) {
          this.saveKey('customers', cleanList);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "customers");
      });
      this.unsubscribes.push(unsubCustomers);

      // 3. Listen to expenses
      const unsubExpenses = this.safeOnSnapshot(collection(db, parent, 'expenses'), (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as Expense);
        });
        const mockExpenseIds = ['exp-1', 'exp-2', 'exp-3', 'exp-4', 'exp-5', 'exp-6', 'exp-7'];
        const cleanList = list.filter(e => !mockExpenseIds.includes(e.id));

        const currentLocal = this.loadKey<Expense[]>('expenses', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(cleanList)) {
          this.saveKey('expenses', cleanList);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "expenses");
      });
      this.unsubscribes.push(unsubExpenses);

      // 4. Listen to branches
      const unsubBranches = this.safeOnSnapshot(collection(db, parent, 'branches'), (snapshot) => {
        const list: Branch[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as Branch);
        });
        const currentLocal = this.loadKey<Branch[]>('branches', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('branches', list);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "branches");
      });
      this.unsubscribes.push(unsubBranches);

      // 5. Listen to services
      const unsubServices = this.safeOnSnapshot(collection(db, parent, 'services'), (snapshot) => {
        const list: Service[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as Service);
        });
        const currentLocal = this.loadKey<Service[]>('services', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('services', list);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "services");
      });
      this.unsubscribes.push(unsubServices);

      // 6. Listen to users
      const unsubUsers = this.safeOnSnapshot(collection(db, parent, 'users'), (snapshot) => {
        const list: User[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as User);
        });
        const currentLocal = this.loadKey<User[]>('users', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('users', list);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "users");
      });
      this.unsubscribes.push(unsubUsers);

      // 7. Listen to attendance
      const unsubAttendance = this.safeOnSnapshot(collection(db, parent, 'attendance'), (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as AttendanceRecord);
        });
        // Always sort descending by checkIn date in real-time
        list.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
        const currentLocal = this.loadKey<AttendanceRecord[]>('attendance', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('attendance', list);
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "attendance");
      });
      this.unsubscribes.push(unsubAttendance);

      // 8. Listen to settings
      const unsubSettings = this.safeOnSnapshot(doc(db, parent, 'settings', 'system'), (snapshot) => {
        if (snapshot.exists()) {
          const s = snapshot.data() as SystemSettings;
          const currentLocal = this.loadKey<SystemSettings | null>('settings', null);
          if (JSON.stringify(currentLocal) !== JSON.stringify(s)) {
            this.saveKey('settings', s);
            window.dispatchEvent(new CustomEvent('laughdry_settings_updated', { detail: s }));
            window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
            window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
          }
        }
      }, (error) => {
        this.handleRealtimeError(error, "settings");
      });
      this.unsubscribes.push(unsubSettings);

      // 9. Listen to perfumes (parfume collection)
      const unsubPerfumes = this.safeOnSnapshot(collection(db, parent, 'parfume'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data());
        });
        const currentLocal = this.loadKey<any[]>('perfumes', []);
        if (JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('perfumes', list);
          window.dispatchEvent(new CustomEvent('laughdry_perfumes_updated'));
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "perfumes");
      });
      this.unsubscribes.push(unsubPerfumes);

      // 10. Listen to templates
      const unsubTemplates = this.safeOnSnapshot(collection(db, parent, 'templates'), (snapshot) => {
        const list: WhatsAppTemplate[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as WhatsAppTemplate);
        });
        const currentLocal = this.loadKey<WhatsAppTemplate[]>('templates', []);
        if (list.length > 0 && JSON.stringify(currentLocal) !== JSON.stringify(list)) {
          this.saveKey('templates', list);
          window.dispatchEvent(new CustomEvent('laughdry_templates_updated'));
          window.dispatchEvent(new CustomEvent('laughdry_data_changed'));
          window.dispatchEvent(new CustomEvent('laughdry_db_synced'));
        }
      }, (error) => {
        this.handleRealtimeError(error, "templates");
      });
      this.unsubscribes.push(unsubTemplates);

    } catch (e) {
      console.error("Error starting realtime listeners:", e);
    }
  }

  public static stopRealtimeListeners(): void {
    this.unsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (e) {}
    });
    this.unsubscribes = [];
  }
}
