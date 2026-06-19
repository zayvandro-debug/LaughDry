import React, { useState } from 'react';
import { Expense, User, ExpenseCategory } from '../types';
import { LaughDryDatabase } from '../data/mockDatabase';

interface ExpenseManagementProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  currentUser: User;
  onShowToast: (msg: string) => void;
  loadDB: () => void;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({
  expenses,
  setExpenses,
  currentUser,
  onShowToast,
  loadDB,
}) => {
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Lainnya' as ExpenseCategory,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      alert("Lengkapi deskripsi dan jumlah nominal pengeluaran!");
      return;
    }

    const amountSanitized = expenseForm.amount.replace(/[,.]/g, '');
    const amountVal = parseFloat(amountSanitized);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Masukkan nominal rupiah pengeluaran yang valid!");
      return;
    }

    if (editingExpense) {
      const updatedExpenses = expenses.map(e => {
        if (e.id === editingExpense.id) {
          return {
            ...e,
            description: expenseForm.description,
            category: expenseForm.category,
            amount: amountVal,
            date: expenseForm.date ? new Date(expenseForm.date).toISOString() : e.date,
            paymentMethod: expenseForm.paymentMethod,
          };
        }
        return e;
      });

      LaughDryDatabase.saveExpenses(updatedExpenses);
      setExpenses(updatedExpenses);

      LaughDryDatabase.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'EXPENSE_UPDATE',
        `Mengubah pengeluaran [${editingExpense.category}] "${editingExpense.description}" menjadi "${expenseForm.description}" Rp ${amountVal.toLocaleString()} (${expenseForm.paymentMethod})`
      );

      setEditingExpense(null);
      setExpenseForm({
        description: '',
        category: 'Lainnya',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
      });
      onShowToast("Pengeluaran rutin berhasil diperbarui!");
      loadDB();
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      description: expenseForm.description,
      category: expenseForm.category,
      amount: amountVal,
      branchId: currentUser.branchId,
      date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
      recordedBy: currentUser.name,
      paymentMethod: expenseForm.paymentMethod,
    };

    const currentExpenses = LaughDryDatabase.getExpenses();
    const updatedExpenses = [newExpense, ...currentExpenses];
    LaughDryDatabase.saveExpenses(updatedExpenses);
    setExpenses(updatedExpenses);

    LaughDryDatabase.logActivity(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'EXPENSE_CREATE',
        `Mencatat pengeluaran [${expenseForm.category}] ${expenseForm.description} sebesar Rp ${amountVal.toLocaleString()} [${expenseForm.paymentMethod}]`
    );

    setExpenseForm({
      description: '',
      category: 'Lainnya',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
    });

    onShowToast("Pengeluaran rutin berhasil dicatat!");
    loadDB();
  };

  const startEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      description: exp.description,
      category: exp.category,
      amount: exp.amount.toString(),
      date: exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMethod: exp.paymentMethod || 'Cash',
    });
  };

  const cancelEditExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: '',
      category: 'Lainnya',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
    });
  };

  const executeDeleteExpense = (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return;
    const updated = expenses.filter(e => e.id !== expenseId);
    LaughDryDatabase.saveExpenses(updated);
    setExpenses(updated);
    LaughDryDatabase.logActivity(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'EXPENSE_DELETE',
      `Menghapus pencatatan pengeluaran [${exp.category}] ${exp.description}`
    );
    onShowToast("Pencatatan pengeluaran berhasil dihapus!");
    setDeleteConfirmExpense(null);
    loadDB();
  };

  const branchExps = expenses.filter(e => e.branchId === currentUser.branchId);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const filteredBranchExps = branchExps.filter(e => {
    const expDate = new Date(e.date);
    return expDate >= oneWeekAgo;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn" id="menu-content-expense">
      {/* Form Side */}
      <div className="lg:col-span-5">
        <form onSubmit={handleExpenseSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              {editingExpense ? '✏️ Edit Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-normal font-sans hidden md:block">
              {editingExpense
                ? `Sedang mengedit pengeluaran: "${editingExpense.description}". Anda dapat mengubah nilai deskripsi, kategori, maupun nominal rupiahnya.`
                : 'Masukkan biaya operasional rutin gerai cabang (misal pembelian deterjen, gas harian, listrik bulanan, air, dll) secara akurat.'}
            </p>
          </div>

          <div className="space-y-3 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-slate-600 font-bold block">Deskripsi / Detail Pengeluaran:</label>
              <input
                type="text"
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Contoh: Pembelian Deterjen Konsentrat 5 Liter"
                className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-605 font-bold block">Kategori Pengeluaran:</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                {['Detergen/Softener', 'Listrik', 'Air', 'Maintenance', 'Perlengkapan', 'Gaji', 'Sewa', 'Transportasi', 'Gas', 'Lainnya'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-605 font-bold block">Metode Pengeluaran / Kas:</label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="Cash">💵 Cash / Tunai</option>
                <option value="QRIS">📱 QRIS / Non-Tunai</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-605 font-bold block">Tanggal Pengeluaran:</label>
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-205 p-2.5 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-605 font-bold block">Jumlah Uang / Nominal (Rp):</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400">Rp</span>
                <input
                  type="text"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                    setExpenseForm({ ...expenseForm, amount: val });
                  }}
                  placeholder="Contoh: 125.000 atau 125000"
                  className="w-full bg-slate-50 border border-slate-205 pl-9 pr-4 py-2.5 rounded-xl font-black text-slate-900 text-sm focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            {editingExpense && (
              <button
                type="button"
                onClick={cancelEditExpense}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-705 font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer text-center"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="flex-3 py-3 bg-rose-500 hover:bg-rose-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {editingExpense ? '✏️ Perbarui Pengeluaran' : '💸 Simpan Pengeluaran Harian'}
            </button>
          </div>
        </form>
      </div>

      {/* History / Summary List Side */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Riwayat Pengeluaran Cabang ({filteredBranchExps.length})
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5 hidden md:block">Daftar biaya operasional yang tercatat untuk cabang ini dalam 1 minggu terakhir.</p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredBranchExps.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium whitespace-normal bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Belum ada pengeluaran rutin tercatat dalam 1 minggu terakhir.
              </div>
            ) : (
              filteredBranchExps.map(exp => (
                <div key={exp.id} className={`p-3 border rounded-xl hover:border-slate-300 transition-all flex items-center justify-between gap-3 text-xs ${editingExpense?.id === exp.id ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-150'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-[11.5px]">{exp.description}</span>
                      <span className="bg-slate-100 text-slate-655 text-[9px] font-black px-1.5 py-0.25 rounded-md uppercase tracking-tight border border-slate-200">
                        🏷️ {exp.category}
                      </span>
                      <span className={`text-[9.5px] font-black px-1.5 py-0.25 rounded-md uppercase tracking-tight border ${
                        exp.paymentMethod === 'QRIS'
                           ? 'bg-purple-50 text-purple-700 border-purple-200'
                           : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {exp.paymentMethod === 'QRIS' ? '📱 QRIS' : '💵 Cash'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>📅 {new Date(exp.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                      <span>&bull;</span>
                      <span>Oleh: {exp.recordedBy}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0 font-sans">
                    <span className="font-black text-rose-650 text-sm">Rp {exp.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditExpense(exp)}
                        className="p-1 bg-slate-50 hover:bg-sky-50 text-sky-600 border border-slate-150 rounded-lg transition text-[11px] cursor-pointer"
                        title="Edit Pengeluaran"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmExpense(exp)}
                        className="p-1 px-1.8 bg-red-50 hover:bg-red-105 text-red-650 border border-slate-150 rounded-lg transition text-[11px] cursor-pointer"
                        title="Hapus Pengeluaran"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* POPUP KONFIRMASI HAPUS PENGELUARAN */}
      {/* ========================================================= */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center select-none animate-fadeIn">
            <div className="space-y-2">
              <span className="text-3xl block">🗑️</span>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Hapus Catatan Pengeluaran</h4>
              <p className="text-slate-500 font-semibold text-[11.5px] leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan pengeluaran <strong>"{deleteConfirmExpense.description}"</strong> sebesar <strong>Rp {deleteConfirmExpense.amount.toLocaleString()}</strong>?
              </p>
            </div>
            <div className="flex gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-250 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteExpense(deleteConfirmExpense.id)}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition shadow-md cursor-pointer"
              >
                Ya, Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
