/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Copy, BookOpen, Database, Cpu, Network, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function PRDDocument() {
  const [activeTab, setActiveTab] = useState<'modules' | 'database' | 'api' | 'architecture' | 'scaling'>('modules');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="prd-document-section">
      {/* Header */}
      <div className="bg-[#0F172A] border-b border-slate-800 p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-sky-500/20">
              <BookOpen className="w-3.5 h-3.5 text-[#38BDF8]" />
              Sistem Spesifikasi Teknis & Bisnis (PRD / SRS)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">LaughDry PRD & SRS v2.0</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Dokumen Spesifikasi Produk & Arsitektur Perangkat Lunak Terintegrasi untuk Laundry Kita. Siap diimplementasikan oleh Mobile Developer, Backend, dan SysAdmin.
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 font-mono">
            <div>Terakhir Diperbarui:</div>
            <div className="text-sm font-semibold text-white">30 Mei 2026</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50 scrollbar-none">
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'modules'
              ? 'border-sky-500 text-sky-600 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-modules"
        >
          <BookOpen className="w-4 h-4" />
          1. Modul & User Flow
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'database'
              ? 'border-sky-500 text-sky-600 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-database"
        >
          <Database className="w-4 h-4" />
          2. Struktur Database (ERD)
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'api'
              ? 'border-sky-500 text-sky-600 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-api"
        >
          <Cpu className="w-4 h-4" />
          3. REST API Lengkap
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'architecture'
              ? 'border-sky-500 text-sky-600 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-architecture"
        >
          <Network className="w-4 h-4" />
          4. Arsitektur & Biaya
        </button>
        <button
          onClick={() => setActiveTab('scaling')}
          className={`flex items-center gap-2 px-5 py-4 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'scaling'
              ? 'border-sky-500 text-sky-600 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-scaling"
        >
          <Briefcase className="w-4 h-4" />
          5. Bisnis & Keamanan
        </button>
      </div>

      {/* Content Areas */}
      <div className="p-6 md:p-8">
        
        {/* TAB 1: MODULES & USER FLOW */}
        {activeTab === 'modules' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Analisis Kebutuhan */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Analisis Kebutuhan Sistem & Solusi Bisnis
              </h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Operasional Laundry Kita memerlukan digitalisasi end-to-end guna menanggulangi masalah pencatatan manual, resiko manipulasi kas oleh kasir (fraud), tumpukan baju tanpa status yang jelas, serta komunikasi nota yang sering hilang. 
                <strong> LaughDry</strong> menyelesaikan persoalan ini dengan menyediakan platform multi-titik yang andal, menyatukan backend PostgreSQL+Laravel 12, aplikasi internal Android karyawan (kasir/operator), dashboard web analitik bi-owner, hingga website tracking pelanggan berbasis WhatsApp piring link tanpa login pelik.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-semibold text-emerald-800 text-sm mb-1">POS Kasir Handal</div>
                  <p className="text-xs text-slate-500">Pencatatan kiloan dan satuan terintegrasi, hitungan otomatis, cetak bluetooth thermal printer, & integrasi QRIS.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-semibold text-emerald-800 text-sm mb-1">CRM & Deposit Loyalti</div>
                  <p className="text-xs text-slate-500">Atur saldo deposit pelanggan untuk simplifikasi cashflow di muka, serta auto poin loyalti berhadiah diskon.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-semibold text-emerald-800 text-sm mb-1">BI & Analitik Cerdas</div>
                  <p className="text-xs text-slate-500">Menganalisis pendapatan riil, prediksi omzet esok hari berbasis tren, cohort retensi, hingga cabang terbaik.</p>
                </div>
              </div>
            </div>

            {/* Sitemap & User Flow */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Sitemap & Hierarki Navigasi Aplikasi
              </h3>
              <div className="bg-slate-950 p-5 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                <div className="text-emerald-400 font-semibold mb-2">// PETA SITUS UTAMA (SITEMAP)</div>
                <div>LaughDry App Suite</div>
                <div>├── [Owner Mobile & Web Console]</div>
                <div>│   ├── Dashboard (Realtime Analytics & BI)</div>
                <div>│   ├── Layanan & Tarif (Kelola Harga Kiloan/Satuan & Janji Penyelesaian)</div>
                <div>│   ├── Manajemen Karyawan & Audit Tracker (Audit Logs Karyawan)</div>
                <div>│   ├── Laporan (P&L Jurnal Keuangan, Arus Kas Bulanan, Piutang)</div>
                <div>│   ├── Manajemen Pengeluaran Bisnis (Operational Expenses OPEX)</div>
                <div>│   ├── CRM & Loyalti (Skema Deposit, Top up, Atur Poin Promo)</div>
                <div>│   └── Pengaturan (WhatsApp Templates, Logo Bisnis, Metode Pembayaran)</div>
                <div>│</div>
                <div>├── [Karyawan Mobile POS Sandbox]</div>
                <div>│   ├── Pembuat Transaksi Baru (Input berat kg / detil item satuan)</div>
                <div>│   ├── Kelola Status Laundry (Workflow Progress: Antri &rarr; Cuci &rarr; Setrika &rarr; Kemas &rarr; Siap &rarr; Selesai)</div>
                <div>│   ├── Kelola Profil Pelanggan (Search, Register, Top-up & Guna Saldo Deposit)</div>
                <div>│   ├── Pencatatan Pengeluaran Harian Kas Cabang</div>
                <div>│   └── Utilitas Cetak Bluetooth & Send WhatsApp Nota Link</div>
                <div>│</div>
                <div>└── [Website Pelacakan Pelanggan (No-Login)]</div>
                <div>    ├── Live Tracking Status Timeline + Estimasi Jam/Menit Selesai</div>
                <div>    ├── Rincian Item Nota & Riwayat Status</div>
                <div>    └── Sistem Rating & Feedback Langsung</div>
              </div>
            </div>

            {/* User Flow */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                User Flow Akhlak Bisnis (End-to-End)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <strong className="text-slate-800 text-sm">Pelanggan Drop Paket:</strong>
                    <p className="text-xs text-slate-500 mt-0.5">Membawa cucian ke kasir. Karyawan mengidentifikasi nomor HP pelanggan di sistem (jika baru, input nama & alamat).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <strong className="text-slate-800 text-sm">Penimbangan & Verifikasi Kategori Layanan:</strong>
                    <p className="text-xs text-slate-500 mt-0.5">Item ditimbang (Kiloan) atau dihitung (Satuan). Memilih metode reguler 2 hari atau ekspres 6 jam. Aplikasi otomatis mengonversi tarif + membuat nomor invoice unik.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <strong className="text-slate-800 text-sm">Pembayaran Instan & Cetak Nota:</strong>
                    <p className="text-xs text-slate-500 mt-0.5">Pelanggan memilih metode Cash, QRIS (auto-generated), Transfer bank, atau memotong Saldo Deposit. Cetak nota thermal bluetooth langsung dijalankan & notifikasi WA otomatis dikirim (termasuk link tracking berpantau).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</div>
                  <div>
                    <strong className="text-slate-800 text-sm">Proses Workshop & Notifikasi Siap Ambil:</strong>
                    <p className="text-xs text-slate-500 mt-0.5">Karyawan memproses pakaian sesuai workflow progresif. Ketika beralih ke &quot;Siap Diambil&quot;, sistem merilis WhatsApp otomatis ke pelanggan.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">5</div>
                  <div>
                    <strong className="text-slate-800 text-sm">Serah Terima & Feedback:</strong>
                    <p className="text-xs text-slate-500 mt-0.5">Cucian ditimbang kembali (opsional) & diserahkan. Kasir menutup transaksi. Pelanggan dapat memberikan rating langsung di web tracking.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hak Akses Matriks */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Matriks Hak Akses Pengguna (RBAC)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2.5 border border-slate-200">Fitur Utama LaughDry</th>
                      <th className="p-2.5 border border-slate-200 text-center">Owner</th>
                      <th className="p-2.5 border border-slate-200 text-center">Karyawan (Kasir)</th>
                      <th className="p-2.5 border border-slate-200 text-center font-semibold">Pelanggan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Melihat Omzet & BI Analitik Bisnis</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ (Semua Cabang)</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Mengatur Harga Layanan / Tarif</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Full Edit</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ Read Only</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Menginput Transaksi Baru & Ambil Kas</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Full Edit</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Hanya Cabangnya</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Kelola Pengeluaran Usaha (OPEX)</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Edit & Approve</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Hanya Input</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Melihat Tracking Status & Estimasi</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Semua Transaksi</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Semua Transaksi</td>
                      <td className="p-2.5 border border-slate-200 text-center text-blue-600 font-semibold">✓ Hanya Miliknya (Via URL)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-200 font-semibold">Memberi Rating & Ulasan Layanan</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                      <td className="p-2.5 border border-slate-200 text-center text-red-500 font-bold">✗ No Access</td>
                      <td className="p-2.5 border border-slate-200 text-center text-emerald-600 font-bold">✓ Melalui Web Tracking</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATABASE & ERD */}
        {activeTab === 'database' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Desain Skema Database Logis & Struktur Tabel (PostgreSQL)
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Skema dirancang dengan integritas data referensial penuh (Cascading Rules), tipe data presisi tinggi untuk pencatatan decimal finansial guna menghindari pembulatan matematis float kasar, serta optimalisasi struktur indexing pada foreign keys yang sering dicari dalam query POS Laundry.
              </p>

              {/* DDL SQL Block */}
              <div className="relative">
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(sqlDdl, 'sql')}
                    className="flex items-center gap-1.5 bg-slate-800 text-white rounded-md px-2.5 py-1 text-xs hover:bg-slate-700 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedText === 'sql' ? 'Copied!' : 'Copy SQL'}
                  </button>
                </div>
                <pre className="bg-slate-950 p-5 rounded-xl text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-96">
                  {sqlDdl}
                </pre>
              </div>
            </div>

            {/* Relasi ERD */}
            <div>
              <strong className="text-slate-800 text-sm block mb-2">Penjelasan Relasi ERD:</strong>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-semibold text-teal-800">One-to-Many (1 &rarr; N) Relasi Penting:</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li><code>branches &rarr; orders</code>: Setiap order tercatat pada cabang spesifik.</li>
                    <li><code>customers &rarr; orders</code>: Pelanggan memiliki nol atau banyak transaksi.</li>
                    <li><code>orders &rarr; order_items</code>: Tiap data order memiliki rincian layanan kiloan/satuan di sub-tabel.</li>
                    <li><code>customers &rarr; deposit_mutations</code>: Mutasi top-up dan penarikan saldo disimpan rapi.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-semibold text-teal-800">Optimasi Indexing & Keys:</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>Indeks pada <code>customers.phone</code> karena kasir mencari pelanggan dengan nomor HP.</li>
                    <li>Indeks unik pada <code>orders.invoice_number</code> untuk link tracking cepat dan andal.</li>
                    <li>Tipe data <code>NUMERIC(15,2)</code> untuk kalkulasi finansial guna meminimalkan bug akuntansi.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REST API */}
        {activeTab === 'api' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Dokumentasi RESTful API Endpoints (Laravel 12 Standard)
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Seluruh REST API LaughDry dibentengi oleh JWT Token Authentication di tingkat header (<code>Bearer token...</code>), mengalirkan format payload JSON standard, serta validasi request ketat menggunakan model Laravel Standard FormRequest.
              </p>

              {/* API Endpoints */}
              <div className="space-y-4">
                {/* Endpoint 1 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">POST</span>
                      <code className="text-xs font-mono font-bold text-slate-800">/api/v1/auth/login</code>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold uppercase">Authentication</span>
                  </div>
                  <div className="p-4 text-xs space-y-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Request Payload Body (JSON):</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "username": "rian",
  "password": "password_karyawan_123"
}`}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Response Success (200 OK):</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr-2",
    "name": "Rian Karyawan",
    "role": "karyawan",
    "branch_id": "br-1"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 2 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">POST</span>
                      <code className="text-xs font-mono font-bold text-slate-800">/api/v1/orders</code>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold uppercase">POS Transaction</span>
                  </div>
                  <div className="p-4 text-xs space-y-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Request Body:</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "customer_id": "cust-2",
  "payment_method": "Deposit",
  "notes": "Jas jangan disetrika terlalu panas",
  "items": [
    {
      "service_id": "srv-5",
      "quantity": 2
    }
  ]
}`}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Response Success (201 Created):</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "success": true,
  "message": "Order created & deposit auto-deducted",
  "order": {
    "invoice_number": "LD-20260530-0012",
    "total_amount": 90000,
    "payment_status": "Lunas",
    "tracking_url": "https://laughdry.co.id/track/LD-20260530-0012"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 3 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">PATCH</span>
                      <code className="text-xs font-mono font-bold text-slate-800">/api/v1/orders/{'{invoice}'}/status</code>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold uppercase">Workflow Transition</span>
                  </div>
                  <div className="p-4 text-xs space-y-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Request Body:</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "status": "Siap Diambil"
}`}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Response (Sends Auto-WhatsApp):</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "success": true,
  "status": "Siap Diambil",
  "whatsapp_sent": true,
  "message_preview": "Kabar gembira Kak Diana Lestari..."
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 4 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">GET</span>
                      <code className="text-xs font-mono font-bold text-slate-800">/api/v1/tracking/{'{phone}'}</code>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold uppercase">Link Tracking (No Login)</span>
                  </div>
                  <div className="p-4 text-xs space-y-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Query Params:</div>
                        <div className="bg-slate-50 p-2.5 rounded border text-[11px] text-slate-600">
                          Mengakses riwayat cucian, saldo deposit, serta poin loyalitas berdasar parameter nomor HP terenkripsi / plain dari URL nota WA.
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold mb-1">Response Success (200 OK):</div>
                        <pre className="bg-slate-50 p-2.5 rounded border text-[11px] font-mono leading-relaxed">
{`{
  "success": true,
  "customer": {
    "name": "Diana Lestari",
    "deposit_balance": 35000,
    "loyalty_points": 120
  },
  "active_orders": [...],
  "history_orders": [...]
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & COSTS */}
        {activeTab === 'architecture' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-4">
                Arsitektur Infrastruktur & Biaya Operasional (2026 Cost Calculation)
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Infrastruktur dirancang menggunakan infrastruktur Cloud modern berbasis Container (AWS / Google Cloud) yang aman, hemat biaya saat inisial rilis, dan secara elastis auto-scale seiring bertambahnya cabang Laundry Kita.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Stack Tech Diagram Card */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <Cpu className="w-4 h-4 text-sky-500" />
                    Bagan Stack Teknologi LaughDry ($0 Stack)
                  </h4>
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between p-2.5 bg-white border border-slate-100 rounded">
                      <span className="text-slate-700 font-semibold">Mobile App:</span>
                      <span className="text-slate-600">Flutter Native (Dart) + BLoC State</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white border border-slate-100 rounded">
                      <span className="text-slate-700 font-semibold">Backend API:</span>
                      <span className="text-slate-600">Express Node.js / Laravel on Render Free</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white border border-slate-100 rounded">
                      <span className="text-slate-700 font-semibold">Database:</span>
                      <span className="text-slate-600">Supabase / Neon PostgreSQL (Free tier)</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white border border-slate-100 rounded">
                      <span className="text-slate-700 font-semibold">Payment Gateway:</span>
                      <span className="text-slate-600">Midtrans API Sandbox / QRID gratis</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white border border-slate-100 rounded">
                      <span className="text-slate-700 font-semibold">Platform Hosting:</span>
                      <span className="text-slate-600">Vercel (Frontend) + Render (Backend REST API)</span>
                    </div>
                  </div>
                </div>

                {/* Estimate Cost Card */}
                <div className="p-5 bg-white rounded-xl border-2 border-sky-500/20 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-950 text-sm">
                    Proyeksi Biaya Bulanan Server (100% GRATIS / $0 Monthly Cost)
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between pb-2 border-b border-slate-100">
                      <span>Cloud Database (Supabase Free Tier Postgres, 500MB)</span>
                      <span className="font-mono font-bold text-sky-600">Rp 0 / bln</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-slate-100">
                      <span>Web Server (Render.com / Vercel Serverless Free Hosting)</span>
                      <span className="font-mono font-bold text-sky-600">Rp 0 / bln</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-slate-100">
                      <span>WhatsApp Business Core API (Meta Cloud API Business Platform - 1.000 Free Session)</span>
                      <span className="font-mono font-bold text-sky-600">Rp 0 / bln</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-slate-100">
                      <span>Media Storage (Supabase Storage / Cloudflare R2 - Free 10GB Object Storage)</span>
                      <span className="font-mono font-bold text-sky-600">Rp 0 / bln</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sky-600 font-extrabold text-sm">
                      <span>Total Biaya Operasional (Ops Server)</span>
                      <span>Rp 0 / Selamanya</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-3 border border-sky-100">
                    <p className="text-[11px] leading-relaxed text-sky-900">
                      💡 <strong>Rekomendasi Hemat:</strong> Dengan memanfaatkan Free Tier dari provider modern seperti Supabase, Render, Cloudflare R2, dan Meta Cloud API, Laundry Kita dapat beroperasi tanpa mengeluarkan biaya bulanan sepeser pun.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SCALING & ROADMAP */}
        {activeTab === 'scaling' && (
          <div className="space-y-8 animate-fadeIn text-xs text-slate-600 leading-relaxed">
            {/* Strategi Multi Cabang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  1. Strategi Ekspansi Multi Cabang (SaaS Ready)
                </h4>
                <p>
                  Sistem LaughDry terisi penuh oleh paradigma multitenancy berbasis <code>branch_id</code>. Ketika Owner menambah cabang baru melalui dasbor:
                </p>
                <ul className="list-decimal pl-4 space-y-1.5">
                  <li><strong>Isolasi Kasir:</strong> Karyawan di cabang A eksklusif bertransaksi atas kasir cabang A, menjaga kepatuhan opname kas bulanan secara lokal.</li>
                  <li><strong>Sentralisasi CRM:</strong> Data deposit dan poin loyalti menyatu di seluruh cabang. Pelanggan bisa top-up di Cabang 1 Bintaro, lalu memotong deposit di Cabang 3 Menteng.</li>
                  <li><strong>Konsolidasi Pajak & Keuangan:</strong> Jurnal laba bersih dapat difilter individu cabang maupun konsolidasian entitas korporat LaughDry.</li>
                </ul>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  2. Backup Data, Keamanan, & Mitigasi Risiko
                </h4>
                <p>
                  Menghilangkan resiko manipulasi keuangan dan ketiadaan sinyal internet di kasir:
                </p>
                <ul className="list-decimal pl-4 space-y-1.5">
                  <li><strong>Auto Daily Backup:</strong> Script Cron Job Postgres mengekspor file <code>.sql</code> ke cloud bucket s3 AWS setiap jam 02:00 pagi (dengan kebijakan retensi 30 hari).</li>
                  <li><strong>Offline POS Cache:</strong> SQLite dalam Flutter melacak transaksi lokal saat internet kasir terputus tanpa henti, lalu sync ulang otomatis sewaktu sinyal pulih.</li>
                  <li><strong>Audit Log Komprehensif:</strong> Merekam jejak audit (audit log) setiap perubahan status, pengeluaran kas, mutasi poin, hingga reset password untuk meniadakan potensi penipuan internal.</li>
                </ul>
              </div>
            </div>

            {/* Strategi Monetisasi */}
            <div className="p-5 bg-emerald-950 text-emerald-100 rounded-xl space-y-3">
              <h4 className="font-bold text-white text-sm">
                3. Prospek Komersialisasi & Monetisasi Sistem LaughDry (SaaS Proposal)
              </h4>
              <p className="opacity-90">
                Aplikasi LaughDry tidak hanya digunakan sendiri pada Laundry Kita, namun berpotensi disewakan secara global ke pengusaha laundry lain di Indonesia menggunakan skema SaaS (Software as a Service):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-emerald-200 pt-2 text-[11px]">
                <div className="p-3 bg-white/5 rounded border border-white/10">
                  <div className="font-semibold text-emerald-300">Starter Plan (Rp 99k/bln)</div>
                  <p className="opacity-85 mt-1">Khusus laundry kecil, 1 cabang, maksimal 300 nota per bulan, fitur dasar POS kasir & cetak thermal.</p>
                </div>
                <div className="p-3 bg-white/5 rounded border border-white/10">
                  <div className="font-semibold text-emerald-300">Premium Plan (Rp 249k/bln)</div>
                  <p className="opacity-85 mt-1">1 Cabang, tanpa batas transaksi, integrasi WhatsApp API Fonnte otomatis, manajemen multi-karyawan, BI forecast cerdas.</p>
                </div>
                <div className="p-3 bg-white/5 rounded border border-white/10">
                  <div className="font-semibold text-emerald-300">Enterprise Chain (Rp 499k/bln)</div>
                  <p className="opacity-85 mt-1">Multi Cabang (hingga 5 cabang), hak akses regional owner, kustom cetakan struk, monitoring audit log lanjutan & auto CSV backup excel.</p>
                </div>
              </div>
            </div>

            {/* Roadmap Pengembangan */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-l-4 border-emerald-600 pl-3 mb-3">
                Garis Waktu Proyek (Roadmap Pengembangan v2.0 - 12 Minggu)
              </h3>
              <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-5 text-[11px]">
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <strong>Minggu 1-3: Pemodelan Skema Data & Pengembangan REST API Backend</strong>
                  <p className="text-slate-500">Inisialisasi Project Laravel 12, pembuatan migrasi database postgresql, implementasi JWT Token Auth, controller CRUD Order, Layanan, & Deposit Mutations.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <strong>Minggu 4-6: Slicing UI & Logika Aplikasi Mobile Flutter Karyawan</strong>
                  <p className="text-slate-500">Implementasi State Manager BLoC/Provider untuk POS, mengonfigurasi cetakan struk thermal via package bluetooth_print, dan mengaktifkan fungsionalitas scan nota QR Code.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <strong>Minggu 7-9: Web Dashboard Owner & Dashboard Business Intelligence</strong>
                  <p className="text-slate-500">Membangun Web Admin berbasis React/Vite, merakit interface charting visual mingguan, dan menerapkan module analitik ramalan omzet & retensi bulanan.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
                  <strong>Minggu 10-12: Pengujian Integrasi WhatsApp & Uji Kelayakan Aplikasi</strong>
                  <p className="text-slate-500">Pengetesan komprehensif webhook Midtrans QRIS, penyesuaian penanda status link tracking otomatis, mengunduh rilis APK siap instalasi lapangan.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const sqlDdl = `-- DDL IMPLEMENTASI POSTGRESQL UNTUK LAUGHDRY
-- Didesain kokoh untuk transaksi real-time dan multi-cabang

-- 1. Tabel Cabang (Branches)
CREATE TABLE branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Layanan Laundry (Services Configurable)
CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('kiloan', 'satuan')),
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(10) NOT NULL, -- 'kg', 'pcs', 'sheet'
    estimate_hours INT NOT NULL DEFAULT 48, -- Janji penyelesaian (jam)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Pelanggan CRM (Customers)
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- Indeks pencarian utama kasir rujukan WhatsApp
    address TEXT,
    deposit_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    loyalty_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Transaksi Utama (Orders)
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL, -- "LD-YYYYMMDD-XXXX"
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL, -- 'Cash', 'QRIS', 'Transfer', 'Deposit'
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('Lunas', 'Belum Lunas')),
    status VARCHAR(50) NOT NULL DEFAULT 'Antri', -- 'Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai', 'Dibatalkan'
    notes TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_completion TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INT NOT NULL DEFAULT 0,
    points_redeemed INT DEFAULT 0
);

-- Index percepat kueri pencarian invoice & status laundry
CREATE INDEX idx_orders_invoice ON orders(invoice_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_customers_phone ON customers(phone);

-- 5. Tabel Detil Item Transaksi (Order Items)
CREATE TABLE order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    price DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL, -- berat kg atau kuantitas pcs
    subtotal DECIMAL(15,2) NOT NULL
);

-- 6. Tabel Pengeluaran Bisnis OPEX (Expenses)
CREATE TABLE expenses (
    id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Gaji', 'Listrik', 'Air', 'Sewa', 'Perlengkapan', 'Detergen/Softener', 'Transportasi', 'Maintenance', 'Lainnya'
    amount DECIMAL(15,2) NOT NULL,
    branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    recorded_by VARCHAR(100) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Mutasi Dompet Deposit (Deposit Mutations Ledger)
CREATE TABLE deposit_mutations (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('top_up', 'use')),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    invoice_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Audit Log Keamanan (Audit Logs)
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;
