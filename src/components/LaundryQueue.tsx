import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle } from 'lucide-react';
import { Order, User, OrderStatus } from '../types';
import { LaughDryDatabase } from '../data/mockDatabase';

interface LaundryQueueProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  currentUser: User;
  onShowToast: (msg: string) => void;
  loadDB: () => void;
  handleOpenEditOrderModal: (order: Order) => void;
  handleTransitionStatus: (orderId: string, currentStatus: OrderStatus) => void;
  setActiveInvoice: (order: Order) => void;
  setShowInvoiceChoiceModal: (show: boolean) => void;
  setShowOrderDetailModal: (order: Order | null) => void;
}

export const LaundryQueue: React.FC<LaundryQueueProps> = ({
  orders,
  setOrders,
  currentUser,
  onShowToast,
  loadDB,
  handleOpenEditOrderModal,
  handleTransitionStatus,
  setActiveInvoice,
  setShowInvoiceChoiceModal,
  setShowOrderDetailModal,
}) => {
  const [processGroupBy, setProcessGroupBy] = useState<'queue' | 'laundry' | 'ironing' | 'packing' | 'ready' | 'completed'>('queue');
  const [directPaymentOrderId, setDirectPaymentOrderId] = useState<string | null>(null);

  // Cash / QRIS helper states
  const [cashPaymentOrder, setCashPaymentOrder] = useState<Order | null>(null);
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [qrisPaymentOrder, setQrisPaymentOrder] = useState<Order | null>(null);
  const [qrisStatus, setQrisStatus] = useState<'pending' | 'success'>('pending');

  const handlePayOrder = (orderId: string, method: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: 'Lunas',
          paymentMethod: method,
          updatedAt: new Date().toISOString(),
          paymentDate: new Date().toISOString()
        };
      }
      return o;
    });

    LaughDryDatabase.saveOrders(updated);
    setOrders(updated);

    const paidOrder = orders.find(o => o.id === orderId);
    if (paidOrder) {
      LaughDryDatabase.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'STATUS_TRANSITION',
        `Membayar order ${paidOrder.invoiceNumber} sebesar Rp ${paidOrder.totalAmount.toLocaleString()} dengan metode [${method}] langsung dari Papan Antrean`
      );
    }

    onShowToast(`Berhasil melunasi pembayaran order via ${method}!`);
    setDirectPaymentOrderId(null);
    setCashPaymentOrder(null);
    setQrisPaymentOrder(null);
    loadDB();
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("apakah akan benar dihapus?")) {
      const orderToDelete = orders.find(o => o.id === orderId);
      const updated = orders.filter(o => o.id !== orderId);
      LaughDryDatabase.saveOrders(updated);
      setOrders(updated);

      if (orderToDelete) {
        const pDeduct = orderToDelete.pointsEarned !== undefined ? orderToDelete.pointsEarned : 1;
        const allCustomers = LaughDryDatabase.getCustomers();
        const updatedCustomers = allCustomers.map(c => {
          if (c.id === orderToDelete.customerId) {
            return {
              ...c,
              loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) - pDeduct)
            };
          }
          return c;
        });
        LaughDryDatabase.saveCustomers(updatedCustomers);
      }

      LaughDryDatabase.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'ORDER_DELETE',
        `Menghapus orderan id [${orderId}]`
      );
      onShowToast("Orderan berhasil dihapus secara permanen!");
      loadDB();
    }
  };

  const handleClearAllActiveQueue = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua antrean cucian aktif di cabang ini?")) {
      const remainingOrders = orders.filter(o => o.branchId !== currentUser.branchId || o.status === OrderStatus.SELESAI || o.status === OrderStatus.DIBATALKAN);
      LaughDryDatabase.saveOrders(remainingOrders);
      setOrders(remainingOrders);
      LaughDryDatabase.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'QUEUE_CLEAR_ALL',
        'Mengosongkan papan antrean kerja aktif cabang'
      );
      onShowToast("Papan antrean diclear!");
      loadDB();
    }
  };

  const branchOrders = orders.filter(o => o.branchId === currentUser.branchId);

  // In-process filters mapped from processGroupBy state
  const getFilteredInProcessOrders = () => {
    return branchOrders.filter(o => {
      if (processGroupBy === 'queue') return o.status === OrderStatus.ANTRI;
      if (processGroupBy === 'laundry') return o.status === OrderStatus.DICUCI;
      if (processGroupBy === 'ironing') return o.status === OrderStatus.DISETRIKA_DILIPAT;
      if (processGroupBy === 'packing') return o.status === OrderStatus.DIKEMAS;
      if (processGroupBy === 'ready') return o.status === OrderStatus.SIAP_DIAMBIL;
      if (processGroupBy === 'completed') return o.status === OrderStatus.SELESAI;
      return false;
    }).slice(0).reverse();
  };

  const displayOrders = getFilteredInProcessOrders();

  return (
    <div className="space-y-6 animate-fadeIn" id="menu-content-queue">
      {/* Workflow Orders List tracker section */}
      <div className="bg-white p-2.5 sm:p-5 rounded-none sm:rounded-2xl border-x-0 sm:border border-slate-150 shadow-none sm:shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 px-1.5 sm:px-0">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              Papan Alur Proses Kerja & Siap Ambil
            </h3>
            <p className="text-[10.5px] text-slate-400 font-sans hidden md:block">Semua cucian aktif digabung dalam satu papan proses pengerjaan terintegrasi.</p>
          </div>
        </div>

        {/* Combined Process Table & Group Section */}
        <div className="space-y-4">
          <div className="bg-slate-50/40 p-2 sm:p-3 rounded-none sm:rounded-2xl border-x-0 sm:border border-slate-150 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 px-1.5 sm:px-0">
              <span className="text-[11px] font-extrabold text-slate-705 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                ⚙️ Proses Kerja & Siap Diambil
              </span>
              <span className="text-[9.5px] text-slate-450 font-mono hidden md:inline">Alur: Antrean ➔ Cuci ➔ Setrika/Lipat ➔ Kemas ➔ Siap ➔ Selesai</span>
            </div>

            {/* Responsive Tabs Navigation for mobile scrollable, desktop grid - replaces select dropdown with layout transitions */}
            <div className="flex overflow-x-auto whitespace-nowrap sm:grid sm:grid-cols-6 gap-1 pt-0.5 pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x select-none border-b border-slate-150 sm:border-b-0 px-1 sm:px-0 scroll-smooth">
              {[
                { key: 'queue', label: '🕒 Antrean', count: branchOrders.filter(o => o.status === OrderStatus.ANTRI).length },
                { key: 'laundry', label: '💦 Laundry', count: branchOrders.filter(o => o.status === OrderStatus.DICUCI).length },
                { key: 'ironing', label: '👔 Setrika', count: branchOrders.filter(o => o.status === OrderStatus.DISETRIKA_DILIPAT).length },
                { key: 'packing', label: '📦 Packing', count: branchOrders.filter(o => o.status === OrderStatus.DIKEMAS).length },
                { key: 'ready', label: '✅ Siap Ambil', count: branchOrders.filter(o => o.status === OrderStatus.SIAP_DIAMBIL).length },
                { key: 'completed', label: '🏆 Selesai', count: branchOrders.filter(o => o.status === OrderStatus.SELESAI).length },
              ].map(tab => {
                const isSelected = processGroupBy === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setProcessGroupBy(tab.key as any)}
                    className={`relative text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0.5 py-1 sm:py-2 px-2.5 sm:px-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-extrabold transition-all duration-250 outline-none flex-shrink-0 min-w-[74px] sm:min-w-0 snap-center cursor-pointer border ${
                      isSelected
                        ? 'border-transparent text-white font-black'
                        : 'bg-white hover:bg-slate-50 border-slate-205 text-slate-500'
                    }`}
                  >
                    {/* Active indicator background slide/fade animation */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeQueueAlurPill"
                        className="absolute inset-0 bg-slate-900 rounded-lg sm:rounded-xl"
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      />
                    )}
                    
                    {/* Text & label wrapper raised index for relative positioning over layoutId div */}
                    <span className="relative z-10 truncate max-w-full px-0.5">{tab.label}</span>
                    <span className={`relative z-10 mt-0 sm:mt-0.5 ml-0.5 sm:ml-0 px-1 py-0.2 sm:px-1.5 sm:py-0.5 text-[8px] rounded font-black ${
                      isSelected ? 'bg-sky-400 text-slate-950 shadow-xs' : 'bg-slate-150 text-slate-500'
                    }`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Row entries list - Animated container */}
            <div className="space-y-2 mt-3 p-1 max-h-[380px] overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={processGroupBy}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-2 min-h-[50px]"
                >
              {displayOrders.length === 0 ? (
                <div className="py-12 bg-white rounded-xl border border-slate-150 p-6 text-center space-y-1.5">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-[11.5px] font-bold text-slate-500">Antrean kosong pada tahap ini.</p>
                  <p className="text-[9.5px] text-slate-400 leading-normal max-w-xs mx-auto">Mulai layani pelanggan di menu "Basket Baru" untuk menambah cucian!</p>
                </div>
              ) : (
                displayOrders.map(o => {
                  let nextStepLabel = '';
                  if (o.status === OrderStatus.ANTRI) nextStepLabel = 'Cuci 💦';
                  else if (o.status === OrderStatus.DICUCI) nextStepLabel = 'Setrika/Lipat 👔';
                  else if (o.status === OrderStatus.DISETRIKA_DILIPAT) nextStepLabel = 'Kemas 📦';
                  else if (o.status === OrderStatus.DIKEMAS) nextStepLabel = 'Siap Ambil ✅';
                  else if (o.status === OrderStatus.SIAP_DIAMBIL) nextStepLabel = 'Serahkan 🎉';

                  return (
                    <div
                      key={o.id}
                      className="bg-white border border-slate-150 rounded-xl hover:border-sky-305 transition-all shadow-3xs overflow-hidden w-full font-sans"
                    >
                      {/* Desktop Layout - Horizontal Row */}
                      <div className="hidden sm:flex p-3 justify-between items-center gap-2.5">
                        {/* Col 1: Invoice & Customer info */}
                        <div className="flex items-start gap-2 min-w-[140px]">
                          <div className="space-y-0.5 shrink-0">
                            <span className="font-mono font-black text-slate-900 text-[11px] bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded-md block w-fit">
                              {o.invoiceNumber}
                            </span>
                          <span className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-black text-white uppercase tracking-wider ${
                            o.status === OrderStatus.ANTRI ? 'bg-amber-500' :
                            o.status === OrderStatus.DICUCI ? 'bg-sky-500' :
                            o.status === OrderStatus.DISETRIKA_DILIPAT ? 'bg-violet-600' :
                            o.status === OrderStatus.DIKEMAS ? 'bg-fuchsia-500' :
                            o.status === OrderStatus.SIAP_DIAMBIL ? 'bg-teal-600' :
                            'bg-emerald-600'
                          }`}>
                            {o.status === OrderStatus.ANTRI ? '🕒 Antri' :
                             o.status === OrderStatus.DICUCI ? '💦 Cuci' :
                             o.status === OrderStatus.DISETRIKA_DILIPAT ? '👔 Setrika/Lipat' :
                             o.status === OrderStatus.DIKEMAS ? '📦 Kemas' :
                             o.status === OrderStatus.SIAP_DIAMBIL ? '✅ Siap Ambil' : '🏆 Selesai'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-850 text-[11.5px] truncate">{o.customerName}</p>
                          <p className="text-emerald-600 font-mono text-[10.5px] font-extrabold mt-0.5">Rp {o.totalAmount.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      {/* Service items & Estimation details */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[10.5px] text-slate-600 font-extrabold truncate">
                          {o.items.map(it => `${it.serviceName} (${it.quantity}${it.serviceName.toLowerCase().includes('kilo') ? 'kg' : 'pcs'})`).join(', ')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-sans">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 rounded px-1.5 py-0.25">
                            Metode: {o.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1.5 space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-sans">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">📥 Masuk:</span>
                            <span className="font-semibold text-slate-700">{new Date(o.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">⏳ Estimasi:</span>
                            <span className="font-semibold text-slate-700">{new Date(o.estimatedCompletion).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          {o.perfume && (
                            <div className="flex items-center justify-between border-t border-slate-150 pt-0.5 mt-0.5">
                              <span className="text-slate-400">🌸 Parfum:</span>
                              <span className="font-black text-sky-700 uppercase bg-sky-50 px-1.5 rounded text-[8.5px]">{o.perfume}</span>
                            </div>
                          )}
                          {o.notes && (
                            <div className="text-[8.5px] text-slate-500 mt-0.5 leading-relaxed truncate" title={o.notes}>
                              📝 <span className="italic">{o.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Practical actions buttons panel */}
                      <div className="flex items-center gap-1.5 justify-end self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveInvoice(o);
                            setShowInvoiceChoiceModal(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 rounded-lg text-[9.5px] font-bold transition shadow-3xs flex items-center gap-1 cursor-pointer"
                        >
                          📄 Receipt
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditOrderModal(o)}
                          className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-150 rounded-lg text-[9.5px] font-bold transition shadow-3xs flex items-center gap-1 cursor-pointer"
                          title="Edit rincian order"
                        >
                          ✏️ Edit
                        </button>

                        {o.paymentStatus !== 'Lunas' && (
                          <button
                            type="button"
                            onClick={() => setDirectPaymentOrderId(o.id)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9.5px] font-black transition shadow-3xs flex items-center gap-1 cursor-pointer animate-pulse"
                            title="Lakukan pembayaran langsung"
                          >
                            💵 Bayar
                          </button>
                        )}

                        {nextStepLabel && (
                          <button
                            type="button"
                            onClick={() => handleTransitionStatus(o.id, o.status)}
                            className={`px-3 py-1.5 text-white font-black rounded-xl text-[10px] transition flex flex-col items-center justify-center gap-0.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-w-[125px] ${
                              o.paymentStatus === 'Lunas'
                                ? 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-500'
                                : 'bg-rose-600 hover:bg-rose-700 border border-rose-500'
                            }`}
                          >
                            <span>Lanjut: {nextStepLabel}</span>
                            <span className="text-[8.5px] font-black uppercase bg-black/25 px-1.5 py-0.25 rounded-md tracking-wider">
                              {o.paymentStatus === 'Lunas' ? '🟢 Lunas' : '🔴 Belum Lunas'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 border border-red-150 rounded-lg text-[9.5px] transition font-bold cursor-pointer"
                          title="Hapus order ini"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                      </div>

                      {/* Mobile Layout (Optimized compact interactive flow) */}
                      <div className="block sm:hidden p-3 space-y-2">
                        {/* Card Header & Information */}
                        <div className="bg-slate-50/40 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-black text-slate-800 text-[9.5px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              {o.invoiceNumber}
                            </span>

                            {/* Horizontal Utilities (Receipt, Edit, Hapus) */}
                            <div className="flex items-center gap-1.5 bg-white/80 px-1.5 py-0.5 rounded-lg border border-slate-100 font-sans">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveInvoice(o);
                                  setShowInvoiceChoiceModal(true);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-705 flex items-center justify-center text-[8.5px] transition cursor-pointer active:scale-90"
                                title="Cetak Struk"
                              >
                                📄
                              </button>
                              <span className="text-slate-200 text-[8px]">|</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditOrderModal(o);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-705 flex items-center justify-center text-[8.5px] transition cursor-pointer active:scale-90"
                                title="Edit Jasa"
                              >
                                ✏️
                              </button>
                              <span className="text-slate-200 text-[8px]">|</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrder(o.id);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-slate-105 text-rose-600 flex items-center justify-center text-[8.5px] transition cursor-pointer active:scale-95"
                                title="Hapus Order"
                              >
                                🗑️
                              </button>
                            </div>

                            <span className={`inline-block px-1.5 py-0.5 rounded text-[7.5px] font-black text-white uppercase tracking-wider flex-shrink-0 ${
                              o.status === OrderStatus.ANTRI ? 'bg-amber-500' :
                              o.status === OrderStatus.DICUCI ? 'bg-sky-500' :
                              o.status === OrderStatus.DISETRIKA_DILIPAT ? 'bg-violet-600' :
                              o.status === OrderStatus.DIKEMAS ? 'bg-fuchsia-500' :
                              o.status === OrderStatus.SIAP_DIAMBIL ? 'bg-teal-600' : 'bg-emerald-600'
                            }`}>
                              {o.status === OrderStatus.ANTRI ? '🕒 Antri' :
                               o.status === OrderStatus.DICUCI ? '💦 Cuci' :
                               o.status === OrderStatus.DISETRIKA_DILIPAT ? '👔 Setrika' :
                               o.status === OrderStatus.DIKEMAS ? '📦 Kemas' :
                               o.status === OrderStatus.SIAP_DIAMBIL ? '✅ Ready' : '🏆 Selesai'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                              <span>👤</span>
                              <span className="truncate">{o.customerName}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-bold leading-tight">
                              🍱 Jasa: <span className="text-slate-700 font-extrabold">{o.items.map(it => it.serviceName).join(', ')}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1">
                              <span>📅 Est Selesai:</span>
                              <span className="text-slate-705 font-bold">{new Date(o.estimatedCompletion).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div className="pt-1 border-t border-slate-150 flex items-center justify-between text-[10px] font-extrabold">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-200 font-bold">Total:</span>
                                <span className="font-mono text-emerald-650 font-black">Rp {o.totalAmount.toLocaleString('id-ID')}</span>
                              </div>
                              <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase ${
                                o.paymentStatus === 'Lunas' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                  : 'bg-rose-50 text-rose-600 border border-rose-150'
                              }`}>
                                {o.paymentStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Segment - Horizontally aligned processes */}
                        <div className="flex items-stretch gap-1.5">
                          {o.paymentStatus !== 'Lunas' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDirectPaymentOrderId(o.id);
                              }}
                              className="px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9.5px] font-extrabold transition flex items-center justify-center gap-1 shadow-sm active:scale-[0.98] cursor-pointer flex-shrink-0"
                              title="Bayar"
                            >
                              💵 Bayar
                            </button>
                          )}

                          {nextStepLabel ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransitionStatus(o.id, o.status);
                              }}
                              className={`flex-1 py-1.5 text-white font-black rounded-lg text-[9.5px] transition flex flex-row items-center justify-center gap-1.5 shadow-xs border cursor-pointer active:scale-[0.98] ${
                                o.paymentStatus === 'Lunas'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500'
                                  : 'bg-rose-600 hover:bg-rose-700 border-rose-500'
                              }`}
                            >
                              <span className="font-extrabold uppercase tracking-wide">👉 Proses: {nextStepLabel}</span>
                            </button>
                          ) : (
                            <div className="flex-1 py-1.5 bg-slate-100 border border-slate-250 text-slate-500 text-center rounded-lg text-[9px] font-black flex items-center justify-center gap-1 select-none">
                              🏆 Selesai Diantre
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Direct Payment Selection inside Papan Antrean */}
      {directPaymentOrderId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="queue-payment-modal">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl space-y-4 text-left font-sans select-none animate-scaleIn">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metode Pembayaran</span>
              <h4 className="font-extrabold text-[#0D1B2A] text-lg">💵 Selesaikan Pembayaran</h4>
              <p className="text-[11px] text-slate-500 font-semibold font-sans">
                No. Nota: <span className="font-mono font-bold text-sky-850 bg-slate-100 px-1.5 py-0.5 rounded">{orders.find(o => o.id === directPaymentOrderId)?.invoiceNumber}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Lakukan kasir pembayaran manual di kas untuk pelanggan: <strong className="text-slate-800">{orders.find(o => o.id === directPaymentOrderId)?.customerName}</strong>.
              </p>
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-150 mt-3 text-center">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Total Pembayaran</span>
                <span className="text-emerald-800 font-extrabold text-base font-mono">Rp {orders.find(o => o.id === directPaymentOrderId)?.totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <span className="text-[9px] text-slate-400 font-black uppercase block mb-1">Pilih Saluran Pembayaran:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'Cash', label: '💵 Tunai (Cash)', desc: 'Setor uang tunai' },
                { key: 'QRIS', label: '📱 QRIS Dinamis', desc: 'Scan barcode QR' },
                { key: 'Transfer', label: '🏦 Transfer Bank', desc: 'Mutasi rekening' },
                { key: 'Deposit', label: '💰 Saldo Deposit', desc: 'Potong dari deposit' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    const targetOrder = orders.find(o => o.id === directPaymentOrderId);
                    if (!targetOrder) return;
                    if (opt.key === 'Cash') {
                      setCashPaymentOrder(targetOrder);
                      setCashReceivedInput('');
                      setDirectPaymentOrderId(null);
                    } else if (opt.key === 'QRIS') {
                      setQrisPaymentOrder(targetOrder);
                      setQrisStatus('pending');
                      setDirectPaymentOrderId(null);
                    } else {
                      handlePayOrder(directPaymentOrderId, opt.key);
                    }
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-300 transition cursor-pointer text-left flex flex-col justify-between"
                >
                  <span className="font-bold text-slate-850 text-[11px]">{opt.label}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDirectPaymentOrderId(null)}
              className="mt-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer text-center"
            >
              Kembali ke Antrean
            </button>
          </div>
        </div>
      )}

      {/* Modal Input Pembayaran Cash */}
      {cashPaymentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="cash-payment-modal-queue">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl space-y-4 text-left font-sans animate-scaleIn">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Kasir Tunai / Cash</span>
              <h4 className="font-extrabold text-slate-900 text-base">💵 Pembayaran Tunai (Cash)</h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Nomor Nota: <span className="font-mono font-bold text-sky-850">{cashPaymentOrder.invoiceNumber}</span>
              </p>
            </div>

            {/* Total Tagihan */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total Tagihan</span>
              <span className="text-slate-850 font-black text-lg font-mono">Rp {cashPaymentOrder.totalAmount.toLocaleString('id-ID')}</span>
            </div>

            {/* Input Jumlah Uang */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Jumlah Uang Diterima (Rp):</label>
              <input
                type="number"
                value={cashReceivedInput}
                onChange={(e) => setCashReceivedInput(e.target.value)}
                placeholder="Masukkan nominal uang diterima..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Tombol Cepat (Sesuai Tagihan / Pas & Kelipatan) */}
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Pilihan Cepat Sesuai Tagihan:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashReceivedInput(cashPaymentOrder.totalAmount.toString())}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                >
                  💵 Uang Pas: Rp {cashPaymentOrder.totalAmount.toLocaleString('id-ID')}
                </button>
                {(() => {
                  const options = [50000, 100000, 200000].filter(v => v > cashPaymentOrder.totalAmount);
                  return options.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceivedInput(val.toString())}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-205 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      Rp {val.toLocaleString('id-ID')}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Kembalian Status */}
            {cashReceivedInput && (() => {
              const rcv = parseInt(cashReceivedInput, 10) || 0;
              const refund = rcv - cashPaymentOrder.totalAmount;
              const isShort = refund < 0;

              return (
                <div className={`p-3 rounded-2xl border text-center ${
                  isShort ? 'bg-red-50 border-red-150 text-red-700' : 'bg-emerald-50 border-emerald-150 text-emerald-800'
                }`}>
                  <span className="text-[9px] font-bold uppercase tracking-wider block">
                    {isShort ? '⚠️ Kurang Pembayaran' : '🟢 Uang Kembalian'}
                  </span>
                  <span className="font-extrabold text-sm font-mono block mt-0.5">
                    Rp {Math.abs(refund).toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCashPaymentOrder(null);
                  setDirectPaymentOrderId(cashPaymentOrder.id);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition cursor-pointer text-center"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={!cashReceivedInput || (parseInt(cashReceivedInput, 10) || 0) < cashPaymentOrder.totalAmount}
                onClick={() => {
                  const rcvNum = parseInt(cashReceivedInput, 10) || 0;
                  // Log and settle
                  handlePayOrder(cashPaymentOrder.id, 'Cash');
                }}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs shadow-xs transition cursor-pointer text-center"
              >
                Selesaikan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QRIS Terintegrasi Midtrans Simulator */}
      {qrisPaymentOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="qris-payment-modal-queue">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl space-y-4 text-left font-sans animate-scaleIn">
            <div className="text-center space-y-1">
              <span className="text-[9.5px] bg-sky-50 text-sky-850 px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-sky-200 inline-block">
                Midtrans Payment Gateway
              </span>
              <h4 className="font-extrabold text-slate-950 text-sm mt-2">📲 QRIS Dinamis Otomatis</h4>
              <p className="text-[11px] text-slate-500 font-bold">
                Invoice: <span className="font-mono text-sky-800">{qrisPaymentOrder.invoiceNumber}</span>
              </p>
            </div>

            {/* Total Billing */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 text-center">
              <span className="text-[9.5px] text-slate-400 font-bold block uppercase tracking-wider">Total Pembayaran</span>
              <span className="text-emerald-800 font-black text-lg font-mono">Rp {qrisPaymentOrder.totalAmount.toLocaleString('id-ID')}</span>
            </div>

            {/* QR Code Illustration */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-150 relative">
              <div className="w-40 h-40 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center relative">
                {/* Simulated QR Code SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                  <path d="M5,5 h40 v40 h-40 z M15,15 h20 v20 h-20 z" fill="currentColor"/>
                  <path d="M55,5 h40 v40 h-40 z M65,15 h20 v20 h-20 z" fill="currentColor"/>
                  <path d="M5,55 h40 v40 h-40 z M15,65 h20 v20 h-20 z" fill="currentColor"/>
                  <circle cx="50" cy="50" r="14" fill="#0EA5E9" />
                  <path d="M12,48 h8 v4 h-8 z M22,48 h4 v4 h-4 z M48,12 h4 v8 h-4 z M48,22 h4 v4 h-4 z" fill="currentColor"/>
                  <path d="M55,55 h10 v10 h-10 z M65,65 h10 v10 h-10 z M75,75 h20 v20 h-20 z M85,55 h10 v10 h-10 z" fill="currentColor"/>
                  <path d="M55,85 h10 v10 h-10 z M85,75 h10 v10 h-10 z M65,85 h10 v10 h-10 z" fill="currentColor"/>
                  <text x="50" y="53" fill="white" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">QRIS</text>
                </svg>
              </div>
              <span className="text-[9px] text-slate-400 font-bold block uppercase mt-2.5 tracking-wider">Silakan Scan pakai GoPay, OVO, ShopeePay, Dana, LinkAja</span>
            </div>

            {/* Midtrans Status Box */}
            <div className="p-3 bg-orange-50 border border-orange-150 rounded-2xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-orange-850">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                <span>CALLBACK SECURE SANDBOX: MENUNGGU PEMBAYARAN...</span>
              </div>
              <span className="text-[10px] text-orange-600 font-mono block">Kode referensi transaksi terverifikasi: md-{qrisPaymentOrder.invoiceNumber}</span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  // Simulate success immediately
                  onShowToast("🟢 Callback Midtrans Berhasil diterima! Pembayaran lunas via QRIS.");
                  handlePayOrder(qrisPaymentOrder.id, 'QRIS');
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer text-center flex items-center justify-center gap-1"
              >
                <span>🟢 SIMULASI CALLBACK BAYAR SUKSES (SANDBOX)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQrisPaymentOrder(null);
                  setDirectPaymentOrderId(qrisPaymentOrder.id);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-205 text-slate-650 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Batal Selesaikan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
