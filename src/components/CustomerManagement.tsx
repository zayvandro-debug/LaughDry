import React, { useState } from 'react';
import { Search, Phone, Star, UserCheck } from 'lucide-react';
import { Customer, User } from '../types';
import { LaughDryDatabase } from '../data/mockDatabase';

interface CustomerManagementProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currentUser: User;
  onShowToast: (msg: string) => void;
  loadDB: () => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  setCustomers,
  currentUser,
  onShowToast,
  loadDB,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerModalForm, setCustomerModalForm] = useState({ name: '', phone: '', address: '' });
  const [topUpCustomer, setTopUpCustomer] = useState<Customer | null>(null);
  const [topUpModalAmount, setTopUpModalAmount] = useState('');
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);
  const [selectedMobileCustomer, setSelectedMobileCustomer] = useState<Customer | null>(null);

  const executeDeleteCustomer = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    const updated = customers.filter(c => c.id !== customerId);
    LaughDryDatabase.saveCustomers(updated);
    setCustomers(updated);
    LaughDryDatabase.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'CUSTOMER_DELETE',
      `Menghapus pelanggan ${cust.name}`
    );
    onShowToast(`Pelanggan ${cust.name} berhasil dihapus!`);
    setDeleteConfirmCustomer(null);
    loadDB();
  };

  const handleSaveModalCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer?.id === 'new') {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: customerModalForm.name,
        phone: customerModalForm.phone,
        address: customerModalForm.address,
        depositBalance: 0,
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      const updated = [...customers, newCust];
      LaughDryDatabase.saveCustomers(updated);
      setCustomers(updated);
      setEditingCustomer(null);
      onShowToast("Registrasi pelanggan baru sukses!");
    } else if (editingCustomer) {
      const updated = customers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name: customerModalForm.name,
            phone: customerModalForm.phone,
            address: customerModalForm.address,
            lastActive: new Date().toISOString(),
          };
        }
        return c;
      });
      LaughDryDatabase.saveCustomers(updated);
      setCustomers(updated);
      setEditingCustomer(null);
      onShowToast("Informasi profil pelanggan berhasil diperbarui!");
    }
    loadDB();
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpCustomer) return;
    const amountVal = parseFloat(topUpModalAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Masukkan jumlah top up valid!");
      return;
    }

    const updated = customers.map(c => {
      if (c.id === topUpCustomer.id) {
        return {
          ...c,
          depositBalance: c.depositBalance + amountVal,
          lastActive: new Date().toISOString(),
        };
      }
      return c;
    });
    LaughDryDatabase.saveCustomers(updated);
    setCustomers(updated);

    const activeMutations = LaughDryDatabase.getDeposits();
    const mut = {
      id: `mut-${Date.now()}`,
      customerId: topUpCustomer.id,
      customerName: topUpCustomer.name,
      type: 'top_up' as 'top_up',
      amount: amountVal,
      balanceAfter: topUpCustomer.depositBalance + amountVal,
      date: new Date().toISOString(),
    };
    LaughDryDatabase.saveDeposits([mut, ...activeMutations]);

    setTopUpCustomer(null);
    setTopUpModalAmount('');
    onShowToast(`Berhasil Top Up Deposit Rp ${amountVal.toLocaleString()} untuk ${topUpCustomer.name}!`);
    loadDB();
  };

  const query = customerSearch.toLowerCase().trim();
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.phone.includes(query) ||
    (c.address && c.address.toLowerCase().includes(query))
  );

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn" id="menu-content-customer-crm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Database & Manajemen Pelanggan (CRM)
          </h3>
          <p className="text-[10.5px] text-slate-400 mt-1 leading-normal hidden md:block">
            Kelola data profil, alamat rumah, perolehan status poin loyalitas pelanggan, serta top up / mutasi saldo deposit prabayar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCustomerModalForm({ name: '', phone: '', address: '' });
            setEditingCustomer({ id: 'new', name: '', phone: '', address: '', depositBalance: 0, loyaltyPoints: 0, createdAt: '', lastActive: '' });
          }}
          className="px-4 py-2 bg-slate-900 border border-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer"
        >
          ➕ Daftarkan Pelanggan Baru
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Cari nama, nomor HP WhatsApp, atau alamat pelanggan..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="w-full bg-slate-55 border border-slate-205 pl-10 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] rounded-xl font-medium"
          id="crm-customer-search"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p>🚫 Tidak ada data pelanggan yang cocok dengan pencarian "{customerSearch}".</p>
          </div>
        ) : (
          filtered.map(c => (
            <React.Fragment key={c.id}>
              {/* Mobile View: Very simple row layout */}
              <div 
                onClick={() => setSelectedMobileCustomer(c)}
                className="sm:hidden block p-3 bg-white border border-slate-150 rounded-xl hover:border-sky-300 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-xs truncate">{c.name}</p>
                    <p className="font-mono text-slate-450 text-[10px] mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-350" />
                      {c.phone}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-705 border border-amber-200 rounded-md text-[9px] font-black shrink-0">
                    ⭐ {c.loyaltyPoints} Poin
                  </span>
                </div>
              </div>

              {/* Desktop View: Full rich card */}
              <div className="hidden sm:flex p-4 bg-white border border-slate-150 rounded-2xl shadow-3xs hover:shadow-2xs hover:border-sky-300 transition flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{c.name}</p>
                      <p className="font-mono text-slate-450 text-[10.5px] mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-350" />
                        {c.phone}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shrink-0">
                      ⭐ {c.loyaltyPoints} Poin
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-sans line-clamp-2 leading-normal">
                    📍 {c.address || <span className="italic text-slate-400 font-normal">Alamat belum dicantumkan</span>}
                  </p>

                  <div className="p-2.5 bg-sky-50/50 border border-sky-100 rounded-xl flex items-center justify-between">
                    <span className="text-[9.5px] text-sky-850 font-bold uppercase tracking-wider">Saldo Deposit:</span>
                    <span className="font-black text-sky-700 text-xs">Rp {c.depositBalance.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerModalForm({ name: c.name, phone: c.phone, address: c.address || '' });
                      setEditingCustomer(c);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-205 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    ✏️ Edit Profil
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCustomer(c)}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    🗑️ Hapus
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTopUpCustomer(c);
                      setTopUpModalAmount('');
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                  >
                    💰 Top Up
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))
        )}
      </div>

      {/* Pop-up Info Detail Pelanggan untuk Tampilan Mobile */}
      {selectedMobileCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="mobile-customer-detail-modal">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-150 shadow-2xl relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 to-blue-500"></div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mt-1">
              <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wide flex items-center gap-1.5 animate-fadeIn">
                <span>👤 Detail Pelanggan</span>
              </h4>
              <button 
                type="button" 
                onClick={() => setSelectedMobileCustomer(null)} 
                className="text-slate-400 hover:text-slate-655 font-black text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3.5 text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Nama Lengkap</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedMobileCustomer.name}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Nomor WhatsApp</span>
                <p className="font-mono font-bold text-slate-700 text-xs flex items-center gap-1">
                  📞 {selectedMobileCustomer.phone}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Loyalitas</span>
                <p className="font-extrabold text-amber-700 text-xs">⭐ {selectedMobileCustomer.loyaltyPoints} Poin Terdaftar</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Alamat Rumah</span>
                <p className="text-slate-650 leading-normal bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  📍 {selectedMobileCustomer.address || <span className="italic text-slate-400">Alamat belum dicantumkan</span>}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Saldo Deposito Kita</span>
                <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-2xl flex items-center justify-between mt-1">
                  <span className="text-[10px] text-sky-850 font-bold uppercase">Sisa Saldo:</span>
                  <span className="font-black text-sky-700 text-sm">Rp {selectedMobileCustomer.depositBalance.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCustomerModalForm({ name: selectedMobileCustomer.name, phone: selectedMobileCustomer.phone, address: selectedMobileCustomer.address || '' });
                  setEditingCustomer(selectedMobileCustomer);
                  setSelectedMobileCustomer(null);
                }}
                className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-205 rounded-xl text-[10px] font-bold text-center cursor-pointer transition"
              >
                ✏️ Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmCustomer(selectedMobileCustomer);
                  setSelectedMobileCustomer(null);
                }}
                className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-250 rounded-xl text-[10px] font-bold text-center cursor-pointer transition"
              >
                🗑️ Hapus
              </button>

              <button
                type="button"
                onClick={() => {
                  setTopUpCustomer(selectedMobileCustomer);
                  setTopUpModalAmount('');
                  setSelectedMobileCustomer(null);
                }}
                className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-xl text-[10px] font-extrabold text-center cursor-pointer transition"
              >
                💰 Top Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profil Pelanggan Modal Slider overlay */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveModalCustomer} className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-150 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 to-blue-500"></div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-[#0F172A] text-sm uppercase tracking-wide">
                {editingCustomer.id === 'new' ? '👥 Registrasi Pelanggan' : '✏️ Edit Informasi Pelanggan'}
              </h4>
              <button type="button" onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-650 font-black">✕</button>
            </div>

            <div className="space-y-4 my-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-slate-655 block font-bold">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={customerModalForm.name}
                  onChange={(e) => setCustomerModalForm({ ...customerModalForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-655 block font-bold">Nomor WhatsApp:</label>
                <input
                  type="text"
                  required
                  value={customerModalForm.phone}
                  onChange={(e) => setCustomerModalForm({ ...customerModalForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-655 block font-bold">Alamat Rumah:</label>
                <textarea
                  rows={2}
                  value={customerModalForm.address}
                  onChange={(e) => setCustomerModalForm({ ...customerModalForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-xl font-black text-xs"
              >
                Simpan Pelanggan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Up Deposit Modal */}
      {topUpCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleTopUpSubmit} className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-sky-500"></div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-[#0F172A] text-sm uppercase tracking-wide">💰 Top Up Deposit</h4>
              <button type="button" onClick={() => setTopUpCustomer(null)} className="text-slate-400 hover:text-slate-650 font-black">✕</button>
            </div>

            <div className="my-3 p-3 bg-slate-50 border border-slate-150 rounded-2xl">
              <div className="font-bold text-slate-850 text-xs">{topUpCustomer.name}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                Saldo Saat Ini: <span className="text-sky-700 font-black">Rp {topUpCustomer.depositBalance.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3.5 my-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-slate-600 block font-semibold">Nominal Top Up (IDR):</label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={topUpModalAmount}
                  onChange={(e) => setTopUpModalAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl font-bold text-slate-900 text-sm focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Nominal Cepat:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {['20000', '50000', '100000', '200000', '500000', '1000000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTopUpModalAmount(val)}
                      className={`py-2 border rounded-lg font-bold text-[11px] text-center transition ${
                        topUpModalAmount === val
                          ? 'bg-slate-900 border-slate-950 text-white font-black'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Rp {parseInt(val).toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTopUpCustomer(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-black text-xs"
              >
                Proses Top Up
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ========================================================= */}
      {/* POPUP KONFIRMASI HAPUS PELANGGAN */}
      {/* ========================================================= */}
      {deleteConfirmCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center select-none animate-fadeIn">
            <div className="space-y-2">
              <span className="text-3xl block">🗑️</span>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Hapus Data Pelanggan</h4>
              <p className="text-slate-500 font-semibold text-[11.5px] leading-relaxed">
                Apakah Anda benar-benar yakin ingin menghapus data profil pelanggan bernama <strong>"{deleteConfirmCustomer.name}"</strong>? Semua rincian saldo deposit & poin loyalitas mereka akan hilang dari database.
              </p>
            </div>
            <div className="flex gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCustomer(null)}
                className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-250 text-slate-705 font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCustomer(deleteConfirmCustomer.id)}
                className="flex-1 py-1.5 bg-rose-605 hover:bg-rose-700 text-white font-black rounded-xl transition shadow-md cursor-pointer"
              >
                Ya, Hapus Pelanggan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
