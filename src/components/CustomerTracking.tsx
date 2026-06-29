/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Timer,
  ShoppingBag,
  Clock,
  CheckCircle,
  HelpCircle,
  Star,
  MapPin,
  MessageSquare,
  Gift,
  Coins,
  Award,
  History,
  Phone,
  Search,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { LaughDryDatabase } from '../data/mockDatabase';
import { LaundryService } from '../services/laundryService';
import { Order, OrderStatus, Customer } from '../types';

// [FIX] Helper: ambil items dari order — support field 'items' maupun 'services'
// (field 'services' ditambahkan sebagai alias 'items' untuk kompatibilitas Firestore rules)
function getOrderItems(order: Order): any[] {
  return (order as any).items || (order as any).services || [];
}

export default function CustomerTracking() {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedHistory, setCompletedHistory] = useState<Order[]>([]);
  const [ratings, setRatings] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showStampCardModal, setShowStampCardModal] = useState(false);
  const [isUrlSession, setIsUrlSession] = useState(false);
  // [FIX] Loading state untuk feedback visual saat sync/lookup sedang berjalan
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Ready for user search inputs / URL auto-login
  useEffect(() => {
    // [FIX] Fungsi lookup lokal murni dari localStorage — dipakai setelah data sudah tersync
    const lookupFromLocal = (targetPhone: string, fromInvoice?: string): boolean => {
      const custs = LaughDryDatabase.getCustomers();
      const found = custs.find(c => {
        const cClean = c.phone.replace(/\D/g, '');
        const tClean = targetPhone.replace(/\D/g, '');
        return cClean === tClean || c.phone === targetPhone;
      });

      if (found) {
        setCustomer(found);
        setIsUrlSession(true);
        setLookupError(null);
        const allOrders = LaughDryDatabase.getOrders();
        const userOrders = allOrders.filter(o => {
          const oPhoneClean = o.customerPhone ? o.customerPhone.replace(/\D/g, '') : '';
          const fPhoneClean = found.phone ? found.phone.replace(/\D/g, '') : '';
          return o.customerId === found.id || (oPhoneClean && fPhoneClean && oPhoneClean === fPhoneClean);
        });

        const active = userOrders.filter(o => o.status !== OrderStatus.SELESAI && o.status !== OrderStatus.DIBATALKAN);
        const history = userOrders.filter(o => o.status === OrderStatus.SELESAI || o.status === OrderStatus.DIBATALKAN);

        setActiveOrders(active);
        setCompletedHistory(history);
        setToastMessage(`👋 Halo ${found.name}! Informasi cucian Anda berhasil dimuat.`);
        setTimeout(() => setToastMessage(null), 3500);
        return true;
      }
      return false;
    };

    // [FIX] performAutoLookup: sync dari Firestore dulu, lalu lookup lokal
    // Ini yang memungkinkan situs tracking membaca data real dari database owner.
    const performAutoLookup = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const phoneParam = queryParams.get('phone');
      const invoiceParam = queryParams.get('invoice');
      const ownerParam = queryParams.get('owner');

      // Tentukan nomor HP target
      let targetPhone = phoneParam || '';
      if (!targetPhone && invoiceParam) {
        // Coba cari dari local dulu
        const allOrders = LaughDryDatabase.getOrders();
        const foundOrder = allOrders.find(o => o.invoiceNumber === invoiceParam);
        if (foundOrder) targetPhone = foundOrder.customerPhone;
      }

      if (!targetPhone && !invoiceParam && !ownerParam) return;

      // [FIX] Coba lookup lokal dulu (cepat, jika data sudah tersync sebelumnya)
      if (targetPhone && lookupFromLocal(targetPhone)) return;

      // [FIX] Belum ketemu? Sync dari Firestore terlebih dahulu.
      // syncFromFirestore akan membaca owner UID dari ?owner= di URL
      // dan mengambil data (settings, orders, customers) dari Firestore ke localStorage.
      try {
        setIsLoading(true);
        await LaughDryDatabase.syncFromFirestore();
      } catch (e) {
        console.warn('[CustomerTracking] syncFromFirestore gagal:', e);
      } finally {
        setIsLoading(false);
      }

      // Setelah sync, resolve phone dari invoice jika belum ada
      if (!targetPhone && invoiceParam) {
        const allOrders = LaughDryDatabase.getOrders();
        const foundOrder = allOrders.find(o => o.invoiceNumber === invoiceParam);
        if (foundOrder) targetPhone = foundOrder.customerPhone;
      }

      if (targetPhone) {
        setPhoneSearch(targetPhone);
        lookupFromLocal(targetPhone);
      }
    };

    performAutoLookup();

    // Juga re-run jika ada event sync selesai (dari realtime listener atau sync manual)
    const handleDbSynced = () => { performAutoLookup(); };
    window.addEventListener('laughdry_db_synced', handleDbSynced);
    window.addEventListener('laughdry_data_changed', handleDbSynced);

    return () => {
      window.removeEventListener('laughdry_db_synced', handleDbSynced);
      window.removeEventListener('laughdry_data_changed', handleDbSynced);
    };
  }, []);

  // [FIX] lookupCustomerDataByPhone: sync dari Firestore jika tidak ditemukan di lokal
  const lookupCustomerDataByPhone = async (phone: string) => {
    setLookupError(null);

    const doLocalLookup = (ph: string): boolean => {
      const custs = LaughDryDatabase.getCustomers();
      const found = custs.find(c => {
        const cClean = c.phone.replace(/\D/g, '');
        const tClean = ph.replace(/\D/g, '');
        return cClean === tClean || c.phone === ph;
      });
      if (found) {
        setCustomer(found);
        setLookupError(null);
        const allOrders = LaughDryDatabase.getOrders();
        const userOrders = allOrders.filter(o => {
          const oPhoneClean = o.customerPhone ? o.customerPhone.replace(/\D/g, '') : '';
          const fPhoneClean = found.phone ? found.phone.replace(/\D/g, '') : '';
          return o.customerId === found.id || (oPhoneClean && fPhoneClean && oPhoneClean === fPhoneClean);
        });

        const active = userOrders.filter(o => o.status !== OrderStatus.SELESAI && o.status !== OrderStatus.DIBATALKAN);
        const history = userOrders.filter(o => o.status === OrderStatus.SELESAI || o.status === OrderStatus.DIBATALKAN);

        setActiveOrders(active);
        setCompletedHistory(history);
        return true;
      }
      return false;
    };

    // Coba lokal dulu (cepat)
    if (doLocalLookup(phone)) return;

    // [FIX] Tidak ditemukan lokal → sync dari Firestore dulu dengan ?owner= dari URL
    try {
      setIsLoading(true);
      // Paksa sync by phone dari Firestore menggunakan getOrdersByPhone
      const firestoreOrders = await LaundryService.getOrdersByPhone(phone.trim());
      if (firestoreOrders.length > 0) {
        // Simpan ke localStorage agar lookupFromLocal bisa menemukannya
        const existingIds = new Set(firestoreOrders.map((o: Order) => o.id));
        const localOrders = LaughDryDatabase.getOrders().filter((o: Order) => !existingIds.has(o.id));
        LaughDryDatabase['saveKey']?.('orders', [...firestoreOrders, ...localOrders]);
        
        // Sync customer dari order terbaru
        const latestOrder = firestoreOrders[0];
        if (latestOrder.customerId) {
          const firestoreCustomer = await LaundryService.getCustomerById(latestOrder.customerId);
          if (firestoreCustomer) {
            const localCusts = LaughDryDatabase.getCustomers().filter((c: Customer) => c.id !== firestoreCustomer.id);
            LaughDryDatabase['saveKey']?.('customers', [firestoreCustomer, ...localCusts]);
          }
        }
      } else {
        // Coba syncFromFirestore penuh sebagai fallback
        await LaughDryDatabase.syncFromFirestore();
      }
    } catch (e) {
      console.warn('[CustomerTracking] Sync gagal saat lookup:', e);
    } finally {
      setIsLoading(false);
    }

    // Coba lagi setelah sync
    const found = doLocalLookup(phone);
    if (!found) {
      setCustomer(null);
      setActiveOrders([]);
      setCompletedHistory([]);
      setLookupError(`Nomor HP "${phone}" tidak ditemukan dalam database. Pastikan nomor yang Anda masukkan sesuai dengan data pendaftaran di laundry.`);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;
    lookupCustomerDataByPhone(phoneSearch.trim());
  };

  const handleRatingChange = (orderId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], rating }
    }));
  };

  const handleFeedbackChange = (orderId: string, text: string) => {
    setRatings(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], feedback: text }
    }));
  };

  const submitOrderRating = (order: Order) => {
    const rateData = ratings[order.id];
    if (!rateData || !rateData.rating) {
      alert("Harap pilih tingkat bintang ulasan Anda!");
      return;
    }

    const allOrders = LaughDryDatabase.getOrders();
    const updated = allOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          rating: rateData.rating,
          feedback: rateData.feedback || ''
        };
      }
      return o;
    });

    LaughDryDatabase.saveOrders(updated);
    
    // Log Activity
    LaughDryDatabase.logActivity('usr-3', order.customerName, 'pelanggan', 'FEEDBACK_SUBMIT', `Pelanggan memberikan rating bintang [${rateData.rating}] pada nota ${order.invoiceNumber}`);

    // Refresh lists
    lookupCustomerDataByPhone(customer?.phone || '');
    setToastMessage("Terima kasih atas ulasan berharga Anda! Masukan Anda telah tersimpan di PostgreSQL.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6" id="customer-tracking-root">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-[#0F172A] border border-slate-800 text-[#38BDF8] px-4 py-3 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle className="w-5 h-5 text-[#38BDF8]" />
          <span className="text-xs font-semibold text-white">{toastMessage}</span>
        </div>
      )}

      {/* Phone Number Look Up Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleLookupSubmit} className="flex flex-col md:flex-row gap-2 max-w-lg">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="Masukkan No HP Anda (misal: 081299887766)..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] font-mono font-semibold"
              id="customer-tracking-phone-id"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
            id="btn-trigger-tracking-phone-look"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mencari...
              </>
            ) : (
              <>
                Lacak Sekarang <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* [FIX] Tampilkan loading indicator saat sync sedang berlangsung */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Mengambil data terbaru dari server...
          </div>
        )}

        {/* [FIX] Tampilkan pesan error jika nomor HP tidak ditemukan */}
        {lookupError && !isLoading && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            ⚠️ {lookupError}
          </div>
        )}

        {/* Empty container space */}
      </div>

      {/* Main results panel */}
      {customer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Left split columns (5 cols): Customer stats & Wallets */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Customer mini profile info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kartu CRM Pelanggan</span>
                {isUrlSession && (
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border border-emerald-150 animate-pulse">
                    🔓 Tautan Aktif
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base text-slate-800">{customer.name}</h3>
              <div className="text-slate-500 text-xs font-semibold">{customer.phone}</div>
              <div className="text-slate-400 text-xs">Alamat drop-off: {customer.address}</div>
            </div>

            {/* Wallet points & Balance cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Deposit Balance */}
              <div className="bg-gradient-to-br from-blue-500/5 to-sky-500/5 border border-sky-500/20 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 bg-[#1E293B] text-[#38BDF8] rounded-xl flex items-center justify-center font-bold">
                  Rp
                </div>
                <div>
                  <span className="text-[10px] text-sky-800 font-semibold uppercase tracking-wider">Saldo Deposit Anda</span>
                  <div className="text-slate-900 font-black text-base mt-0.5">Rp {customer.depositBalance.toLocaleString('id-ID')}</div>
                  <span className="text-[9px] text-slate-500">Bisa potong otomatis waktu transaksi</span>
                </div>
              </div>

              {/* Loyalty Reward coins */}
              <div
                onClick={() => setShowStampCardModal(true)}
                className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border border-amber-500/20 hover:border-amber-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 group"
                title="Klik untuk membuka 10 Kartu Stamp Loyalti"
                id="loyalty-stamps-tracking-card"
              >
                <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-all">
                  <Gift className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Koin Loyalitas (Stamp Masuk)</span>
                    <span className="text-[8px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-black animate-bounce">LIHAT STAMP ⭐</span>
                  </div>
                  <div className="text-amber-700 font-extrabold text-base mt-0.5">{customer.loyaltyPoints} Coins / Stamp</div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Tukar / pakai stamp untuk mendapatkan kupon gratis cuci!</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right split columns (8 cols): Order statuses & history */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Live Active tracker timelines */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Timer className="w-4 h-4 text-sky-500 animate-spin-slow" />
                Status Cucian Aktif Anda ({activeOrders.length})
              </h4>

              {activeOrders.length === 0 ? (
                <div className="p-10 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                  Anda tidak memiliki pakaian kotor yang sedang diproses saat ini.
                </div>
              ) : (
                activeOrders.map(order => {
                  
                  const steps = [
                    OrderStatus.ANTRI,
                    OrderStatus.DICUCI,
                    OrderStatus.DISETRIKA_DILIPAT,
                    OrderStatus.DIKEMAS,
                    OrderStatus.SIAP_DIAMBIL
                  ];

                  const currentIdx = steps.indexOf(order.status);

                  return (
                    <div key={order.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                      
                      {/* Invoice meta info */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-2.5 text-xs">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="text-sky-400 font-extrabold bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-0.5">{order.invoiceNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Estimasi Selesai: {new Date(order.estimatedCompletion).toLocaleString('id-ID')}</div>
                        </div>

                        <div className="text-right font-black text-slate-900">
                          Total: Rp {order.totalAmount.toLocaleString()} ({order.paymentStatus})
                        </div>
                      </div>

                      {/* Timeline Workflow Visualizer Steps */}
                      <div className="relative pt-3 pb-2 text-[10.5px]">
                        
                        {/* Horizontal timeline connect line */}
                        <div className="absolute top-[23px] left-4 right-4 h-1 bg-slate-200 rounded pointer-events-none"></div>
                        <div
                          className="absolute top-[23px] left-4 h-1 bg-sky-500 transition-all duration-500 rounded pointer-events-none"
                          style={{ width: `${(Math.max(0, currentIdx) / (steps.length - 1)) * 96}%` }}
                        ></div>

                        <div className="flex justify-between relative z-10 text-center font-sans">
                          {steps.map((step, i) => {
                            const isDone = i <= currentIdx;
                            const isCurrent = i === currentIdx;

                            return (
                              <div key={step} className="flex flex-col items-center flex-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${
                                  isCurrent
                                    ? 'bg-[#1E293B] text-[#38BDF8] ring-4 ring-sky-100 scale-110 shadow-sm'
                                    : isDone
                                      ? 'bg-sky-500 text-slate-950 font-black shadow-sm'
                                      : 'bg-white text-slate-400 border border-slate-200'
                                }`}>
                                  {isDone && !isCurrent ? '✓' : i + 1}
                                </div>
                                <span className={`text-[9.5px] mt-2 block font-semibold leading-tight max-w-[62px] ${isCurrent ? 'text-slate-900 font-extrabold' : isDone ? 'text-sky-600' : 'text-slate-400'}`}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Items lists summary */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-mono leading-relaxed text-slate-650 space-y-1">
                        <div>🛒 Item laundry: {getOrderItems(order).map((it: any) => `${it.serviceName} (qty: ${it.quantity})`).join(', ')}</div>
                        <div className="flex items-center gap-1 border-t border-slate-100 pt-1 mt-1 text-[10px]">
                          <span>🌸 Pilihan Aroma:</span>
                          <span className="font-bold text-[#0284C7] bg-[#F0F9FF] px-2 py-0.5 rounded-full select-none">
                            {order.perfume || 'Biasa / Tanpa Parfum'}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Completed historic lists with star rating feedback form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                Riwayat Transaksi Laundry Terselesaikan
              </h4>

              {completedHistory.length === 0 ? (
                <div className="p-10 rounded-2xl text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-205">
                  Anda belum memiliki riwayat pakaian selesai atau dibatalkan sebelumnya.
                </div>
              ) : (
                completedHistory.map(order => {
                  const isCanceled = order.status === OrderStatus.DIBATALKAN;

                  return (
                    <div key={order.id} className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-3 font-sans text-xs">
                      
                      <div className="flex justify-between items-center text-slate-600 select-none">
                        <div>
                          <span className="font-mono font-bold text-slate-800">{order.invoiceNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">Selesai: {new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${isCanceled ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Item: {getOrderItems(order).map((it: any) => it.serviceName).join(', ')}
                      </div>

                      {/* Interactive Customer Rating & Reviews Module */}
                      {!isCanceled && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                          {order.rating ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <span>Penilaian Anda:</span>
                                <div className="flex gap-0.5 text-amber-500">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`w-3.5 h-3.5 ${star <= order.rating! ? 'fill-current' : 'text-slate-200'}`} />
                                  ))}
                                </div>
                              </div>
                              {order.feedback && (
                                <p className="text-[11px] text-slate-500 italic font-mono">&quot;{order.feedback}&quot;</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              <div className="font-bold text-slate-600">Berikan Nilai Kualitas Laundry Kami:</div>
                              
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map(star => {
                                    const currRating = ratings[order.id]?.rating || 0;
                                    return (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingChange(order.id, star)}
                                        className="text-amber-500 rounded p-0.5 hover:scale-110 transition"
                                      >
                                        <Star className={`w-5 h-5 ${star <= currRating ? 'fill-current' : 'text-slate-200'}`} />
                                      </button>
                                    );
                                  })}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">({ratings[order.id]?.rating || 0} / 5 bintang)</span>
                              </div>

                              <div className="space-y-1">
                                <input
                                  type="text"
                                  placeholder="Ketik ulasan Anda (contoh: Wangi sekali, baju sangat bersih!)..."
                                  value={ratings[order.id]?.feedback || ''}
                                  onChange={(e) => handleFeedbackChange(order.id, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => submitOrderRating(order)}
                                  className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-lg text-[10px] transition"
                                >
                                  Kirim Ulasan Kasir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-400 leading-relaxed bg-white border border-slate-200 rounded-3xl shadow-sm">
          🔍 Menunggu inputan nomor ponsel Anda di atas untuk menampilkan stats & riwayat.
        </div>
      )}

      {/* ========================================================= */}
      {/* POP-UP KARTU STAMP LOYALTI PELANGGAN (10 STAMPS) */}
      {/* ========================================================= */}
      {showStampCardModal && customer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="stamp-loyalty-tracking-modal">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl relative overflow-hidden font-sans">
            
            {/* Top decorative badge */}
            <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-400 to-yellow-500"></div>

            {/* Modal Header */}
            <div className="text-center pb-3 border-b border-slate-100 space-y-1 mt-1.5">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 shadow-sm">
                <Gift className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">Kartu Stamp Loyalitas Anda</h4>
              <p className="text-[10.5px] text-slate-400">Poin Pelanggan Terintegrasi LaughDry</p>
            </div>

            {/* Customer Information Box */}
            <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl text-xs space-y-1.5 mt-4">
              <div className="flex justify-between items-center text-slate-500">
                <span>Pelanggan:</span>
                <span className="font-extrabold text-slate-800">{customer.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>ID/No HP:</span>
                <span className="font-mono text-slate-700 font-semibold">{customer.phone}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-1.5 mt-1 text-slate-500">
                <span>Total Koin:</span>
                <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                  ⭐ {customer.loyaltyPoints} Coins
                </span>
              </div>
            </div>

            {/* Stamp Progress card label */}
            <div className="text-center mt-4">
              <div className="text-xs font-black text-slate-700 uppercase tracking-widest text-[9.5px]">
                STAMP CARD PROGRESS &bull; {customer.loyaltyPoints % 10}/10 STAMPS
              </div>
            </div>

            {/* Visual 10 Stamps Grid */}
            <div className="grid grid-cols-5 gap-3.5 py-4 max-w-sm mx-auto">
              {Array.from({ length: 10 }).map((_, i) => {
                const activeStampsCount = customer.loyaltyPoints % 10;
                // If point is completely positive and multiple of 10, fill all 10 stamps
                const finalStampsFilled = (customer.loyaltyPoints > 0 && activeStampsCount === 0) ? 10 : activeStampsCount;
                const isFilled = i < finalStampsFilled;
                
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      isFilled 
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-600 text-slate-950 scale-105 shadow-md shadow-amber-500/20' 
                        : 'bg-slate-50 border-slate-200/60 text-slate-350 border-dashed'
                    }`}
                    title={isFilled ? `Stamp ${i+1} Terisi` : `Stamp ${i+1} Kosong`}
                    >
                      {isFilled ? (
                        <span className="text-sm font-black animate-scaleIn">🧼</span>
                      ) : (
                        <span className="text-[10px] font-black font-mono text-slate-300">{i + 1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extra reward progress note */}
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10.5px] text-amber-900 leading-normal space-y-1">
              <div className="font-extrabold flex items-center gap-1 text-[11px]">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                Ketentuan Loyalitas Stamp:
              </div>
              <p className="font-sans">
                Setiap 1 transaksi lunas otomatis terhitung sebagai <strong className="font-black">1 stamp</strong>. Lengkapi 10 stamp untuk menukarkan dengan <strong className="font-extrabold text-amber-800">1x Cuci Setrika GRATIS</strong> di gerai LaughDry terdekat!
              </p>
              {Math.floor(customer.loyaltyPoints / 10) > 0 && (
                <div className="border-t border-amber-200/60 pt-1.5 mt-1 font-black text-amber-700 text-center animate-pulse">
                  🏆 Anda memiliki {Math.floor(customer.loyaltyPoints / 10)} voucher cuci gratis siap dipakai!
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 mt-4">
              <button
                type="button"
                onClick={() => setShowStampCardModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl transition-all cursor-pointer text-center text-xs shadow-md"
              >
                Tutup Kartu Stamp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
