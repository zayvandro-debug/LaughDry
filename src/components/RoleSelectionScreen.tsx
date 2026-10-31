import React from 'react';
import { LogOut, ArrowRight, CheckCircle2, Sparkles, Shield, ShoppingBag, LayoutDashboard, Store } from 'lucide-react';
import { motion } from 'motion/react';
import logoImg from '../assets/images/logo_laughdry_1781839107009.jpg';

interface RoleSelectionScreenProps {
  userEmail: string;
  onSelectRole: (role: 'owner' | 'karyawan') => void;
  onSignOut: () => void;
}

/**
 * Logo Opsi Owner: Orang dengan buku catatan dan alat tulis
 * Menggambarkan pemilik bisnis yang memegang buku catatan/buku kas pembukuan dan alat tulis pulpen untuk memantau performa keuangan dan manajemen laundry.
 */
export function OwnerRoleIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Owner: Orang dengan buku catatan dan alat tulis"
    >
      <defs>
        <linearGradient id="ownerBgGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="0.5" stopColor="#0369A1" />
          <stop offset="1" stopColor="#0C4A6E" />
        </linearGradient>
        <linearGradient id="ownerSkinGrad" x1="85" y1="35" x2="115" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBD5B5" />
          <stop offset="1" stopColor="#F5B98A" />
        </linearGradient>
        <linearGradient id="ownerSuitGrad" x1="50" y1="95" x2="150" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="ownerBookGrad" x1="40" y1="110" x2="110" y2="175" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="ownerPenGrad" x1="125" y1="95" x2="155" y2="135" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="softShadowOwner" x="0" y="0" width="200" height="200" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0C4A6E" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="url(#ownerBgGrad)" filter="url(#softShadowOwner)" />
      
      {/* Decorative background grid subtle rings */}
      <circle cx="100" cy="100" r="82" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.35" />
      <circle cx="100" cy="100" r="70" stroke="#BAE6FD" strokeWidth="1" opacity="0.2" />

      {/* Floating Analytics Glow behind head */}
      <circle cx="145" cy="52" r="14" fill="#38BDF8" opacity="0.25" />
      <path d="M138 54 L144 48 L148 51 L153 45" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="153" cy="45" r="2" fill="#38BDF8" />

      {/* Person Body / Suit Shoulders */}
      <path 
        d="M52 178 C52 140 68 114 100 114 C132 114 148 140 148 178 Z" 
        fill="url(#ownerSuitGrad)" 
      />
      {/* Crisp White Shirt Collar & Blue Tie */}
      <path d="M88 114 L100 134 L112 114 Z" fill="#F8FAFC" />
      <path d="M97 124 L103 124 L105 152 L100 158 L95 152 Z" fill="#0284C7" />

      {/* Neck */}
      <rect x="91" y="86" width="18" height="24" rx="4" fill="#E8A878" />

      {/* Head */}
      <ellipse cx="100" cy="64" rx="20" ry="24" fill="url(#ownerSkinGrad)" />
      
      {/* Hair (Neat Modern Professional Style) */}
      <path 
        d="M80 60 C80 44 88 38 100 38 C114 38 121 44 121 54 C121 56 120 62 118 64 C116 57 114 52 108 50 C101 48 93 50 87 56 C83 60 81 64 80 68 Z" 
        fill="#0F172A" 
      />
      {/* Sideburns & Ears */}
      <ellipse cx="79" cy="66" rx="3.5" ry="5.5" fill="#F5B98A" />
      <ellipse cx="121" cy="66" rx="3.5" ry="5.5" fill="#F5B98A" />

      {/* Eyes, Eyebrows & Business Smile */}
      <path d="M89 59 C91 58 94 58 96 59" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M104 59 C106 58 109 58 111 59" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="93" cy="65" r="2.2" fill="#0F172A" />
      <circle cx="107" cy="65" r="2.2" fill="#0F172A" />
      <path d="M94 74 C97 78 103 78 106 74" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

      {/* Glasses (Optional stylish touch for analytical owner) */}
      <rect x="87" y="60" width="11" height="9" rx="2.5" stroke="#38BDF8" strokeWidth="1.4" fill="none" opacity="0.85" />
      <rect x="102" y="60" width="11" height="9" rx="2.5" stroke="#38BDF8" strokeWidth="1.4" fill="none" opacity="0.85" />
      <path d="M98 64 L102 64" stroke="#38BDF8" strokeWidth="1.4" />

      {/* ============================================================ */}
      {/* BUKU CATATAN (NOTEBOOK / BUKU KAS PEMBUKUAN) DI TANGAN KIRI */}
      {/* ============================================================ */}
      {/* Left Arm holding notebook */}
      <path d="M60 145 C60 135 68 128 78 132 L92 138 C94 142 92 148 86 150 L68 156 Z" fill="#1E293B" />
      
      {/* Notebook Base / Cover (Hardcover Binder with rounded corners) */}
      <g transform="rotate(-6 82 142)">
        {/* Shadow under book */}
        <rect x="42" y="112" width="56" height="66" rx="5" fill="#0369A1" />
        {/* Book Outer Cover */}
        <rect x="40" y="110" width="56" height="66" rx="5" fill="url(#ownerBookGrad)" stroke="#E0F2FE" strokeWidth="1.5" />
        {/* Book Spine */}
        <rect x="40" y="110" width="9" height="66" rx="3" fill="#0369A1" />
        <line x1="49" y1="110" x2="49" y2="176" stroke="#0284C7" strokeWidth="1" />
        
        {/* Inner Pages (Paper Sheets) */}
        <rect x="52" y="114" width="40" height="58" rx="2" fill="#FFFFFF" />
        
        {/* Notebook Lines & Checkmarks (Catatan Keuangan & Laporan) */}
        <line x1="56" y1="122" x2="86" y2="122" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="56" y1="130" x2="84" y2="130" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="56" y1="138" x2="88" y2="138" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="56" y1="146" x2="78" y2="146" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="56" y1="154" x2="82" y2="154" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        
        {/* Mini Accent on note (Checkmarks & Totals) */}
        <path d="M56 122 L58 124 L62 120" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M56 130 L58 132 L62 128" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Bookmark Ribbon */}
        <path d="M72 110 L72 126 L76 122 L80 126 L80 110 Z" fill="#EF4444" />
      </g>

      {/* Hand Fingers clutching the notebook */}
      <ellipse cx="68" cy="154" rx="4" ry="7" fill="#F5B98A" transform="rotate(25 68 154)" />
      <ellipse cx="73" cy="157" rx="3.5" ry="6.5" fill="#F5B98A" transform="rotate(20 73 157)" />
      <ellipse cx="78" cy="158" rx="3.5" ry="6" fill="#F5B98A" transform="rotate(15 78 158)" />

      {/* ============================================================ */}
      {/* ALAT TULIS (PEN / PULPEN EKSEKUTIF) DI TANGAN KANAN           */}
      {/* ============================================================ */}
      {/* Right Arm angled inwards poised to write */}
      <path d="M142 144 C140 134 130 128 122 134 L108 142 C106 146 109 152 115 154 L134 158 Z" fill="#1E293B" />
      
      {/* Right Hand clutching the pen */}
      <circle cx="118" cy="144" r="7" fill="#F5B98A" />
      <ellipse cx="114" cy="142" rx="3.5" ry="5.5" fill="#F5B98A" transform="rotate(-30 114 142)" />
      
      {/* The Pen / Stylus Tool */}
      <g transform="rotate(-42 116 142)">
        {/* Pen Body */}
        <rect x="113" y="112" width="6" height="38" rx="2" fill="url(#ownerPenGrad)" stroke="#78350F" strokeWidth="0.8" />
        {/* Pen Grip Section */}
        <rect x="113" y="138" width="6" height="8" fill="#1E293B" />
        {/* Pen Clip */}
        <rect x="111" y="116" width="2" height="14" rx="1" fill="#FEF08A" />
        {/* Metallic Band */}
        <rect x="113" y="128" width="6" height="2" fill="#FEF08A" />
        {/* Pen Nib (Metallic Silver with Fine Writing Tip) */}
        <path d="M113 146 L116 156 L119 146 Z" fill="#CBD5E1" stroke="#475569" strokeWidth="0.6" />
        {/* Fine Point */}
        <circle cx="116" cy="156" r="0.8" fill="#0F172A" />
      </g>

      {/* Sparkle badge near notes */}
      <path d="M42 98 L44 91 L46 98 L53 100 L46 102 L44 109 L42 102 L35 100 Z" fill="#FDE047" />
    </svg>
  );
}

/**
 * Logo Opsi Kasir: Orang dengan mesin kasir dan tumpukan laundry
 * Menggambarkan staf kasir ramah di meja kasir dengan terminal mesin kasir digital/struk POS dan tumpukan pakaian/laundry segar siap cuci & kemas.
 */
export function CashierRoleIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Kasir: Orang dengan mesin kasir dan tumpukan laundry"
    >
      <defs>
        <linearGradient id="cashierBgGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.5" stopColor="#059669" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="cashierSkinGrad" x1="85" y1="35" x2="115" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBD5B5" />
          <stop offset="1" stopColor="#F5B98A" />
        </linearGradient>
        <linearGradient id="cashierUniformGrad" x1="60" y1="90" x2="140" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="posMachineGrad" x1="90" y1="120" x2="155" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <filter id="softShadowCashier" x="0" y="0" width="200" height="200" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#064E3B" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="url(#cashierBgGrad)" filter="url(#softShadowCashier)" />
      
      {/* Decorative background grid subtle rings */}
      <circle cx="100" cy="100" r="82" stroke="#6EE7B7" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.35" />
      <circle cx="100" cy="100" r="70" stroke="#A7F3D0" strokeWidth="1" opacity="0.2" />

      {/* Clean Sparkles / Soap Bubbles */}
      <circle cx="48" cy="62" r="6" fill="#A7F3D0" opacity="0.4" />
      <circle cx="50" cy="60" r="2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="158" cy="68" r="7" fill="#6EE7B7" opacity="0.35" />
      <circle cx="160" cy="66" r="2.5" fill="#FFFFFF" opacity="0.8" />

      {/* Person Body (Kasir with Uniform & Apron) */}
      <path 
        d="M62 178 C62 138 74 108 100 108 C126 108 138 138 138 178 Z" 
        fill="url(#cashierUniformGrad)" 
      />
      {/* Kasir Apron Strap & Nametag */}
      <path d="M82 118 L118 118 L122 178 L78 178 Z" fill="#0F172A" opacity="0.9" />
      <rect x="86" y="126" width="16" height="7" rx="1.5" fill="#FEF08A" />
      <line x1="88" y1="129" x2="98" y2="129" stroke="#78350F" strokeWidth="1.2" />

      {/* Neck */}
      <rect x="92" y="84" width="16" height="22" rx="4" fill="#E8A878" />

      {/* Head */}
      <ellipse cx="100" cy="62" rx="19" ry="23" fill="url(#cashierSkinGrad)" />
      
      {/* Kasir Headset / Cap or Neat Hair with Laundry Service Visor */}
      <path 
        d="M81 58 C81 42 89 36 100 36 C112 36 119 42 119 54 C119 58 117 62 116 63 C113 56 110 52 104 50 C98 48 91 50 86 56 C83 59 81 62 81 66 Z" 
        fill="#0284C7" 
      />
      {/* Friendly Cap Visor */}
      <path d="M80 50 C86 47 114 47 120 50 C123 53 118 54 100 54 C82 54 77 53 80 50 Z" fill="#0369A1" />
      
      {/* Ears */}
      <ellipse cx="80" cy="64" rx="3.5" ry="5.5" fill="#F5B98A" />
      <ellipse cx="120" cy="64" rx="3.5" ry="5.5" fill="#F5B98A" />

      {/* Eyes & Warm Cashier Smile */}
      <path d="M89 58 C91 57 94 57 96 58" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M104 58 C106 57 109 57 111 58" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="93" cy="63" r="2.2" fill="#0F172A" />
      <circle cx="107" cy="63" r="2.2" fill="#0F172A" />
      {/* Friendly wide smile */}
      <path d="M93 71 C96 77 104 77 107 71" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

      {/* Counter Top Bar across front */}
      <rect x="25" y="156" width="150" height="24" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />

      {/* ============================================================ */}
      {/* TUMPUKAN LAUNDRY (STACK OF CLEAN FOLDED CLOTHES / TOWELS)    */}
      {/* Berada di sebelah kiri meja kasir                            */}
      {/* ============================================================ */}
      <g id="laundryStack">
        {/* Layer 1 - Bottom Laundry (Fresh Navy/Denim) */}
        <rect x="32" y="146" width="48" height="11" rx="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" />
        <path d="M34 151 C46 153 66 153 78 151" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" />

        {/* Layer 2 - Middle Laundry (Soft Fresh Lavender/Purple) */}
        <rect x="34" y="136" width="44" height="11" rx="4" fill="#A855F7" stroke="#7E22CE" strokeWidth="1" />
        <path d="M36 141 C46 143 64 143 76 141" stroke="#E9D5FF" strokeWidth="1.2" strokeLinecap="round" />

        {/* Layer 3 - Fresh Mint Green Laundry */}
        <rect x="36" y="126" width="40" height="11" rx="4" fill="#10B981" stroke="#047857" strokeWidth="1" />
        <path d="M38 131 C46 133 62 133 74 131" stroke="#A7F3D0" strokeWidth="1.2" strokeLinecap="round" />

        {/* Layer 4 - Top Crisp White Folded Towel */}
        <rect x="38" y="116" width="36" height="11" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M40 121 C48 123 60 123 72 121" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />

        {/* Fresh Clean Sparkle on Top Laundry */}
        <path d="M44 110 L45.5 106 L47 110 L51 111.5 L47 113 L45.5 117 L44 113 L40 111.5 Z" fill="#FDE047" />
        <circle cx="68" cy="112" r="1.5" fill="#38BDF8" />
      </g>

      {/* Kasir Left Hand resting gently over laundry stack */}
      <ellipse cx="64" cy="138" rx="6" ry="4" fill="#F5B98A" transform="rotate(-10 64 138)" />

      {/* ============================================================ */}
      {/* MESIN KASIR DIGITAL / POS CASH REGISTER                     */}
      {/* Berada di sebelah kanan meja kasir                           */}
      {/* ============================================================ */}
      <g id="cashRegister">
        {/* Main Base Unit / Cash Drawer */}
        <rect x="106" y="140" width="62" height="20" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
        {/* Drawer Keyhole / Slot */}
        <rect x="133" y="149" width="8" height="2" rx="1" fill="#94A3B8" />

        {/* POS Keyboard Pad (Angle view) */}
        <path d="M108 140 L120 128 L160 128 L166 140 Z" fill="#334155" stroke="#475569" strokeWidth="1" />
        {/* Keypad Buttons Grid */}
        <circle cx="126" cy="133" r="1.6" fill="#38BDF8" />
        <circle cx="132" cy="133" r="1.6" fill="#38BDF8" />
        <circle cx="138" cy="133" r="1.6" fill="#38BDF8" />
        <circle cx="144" cy="133" r="1.6" fill="#10B981" />
        <circle cx="150" cy="133" r="1.6" fill="#F43F5E" />
        
        <circle cx="124" cy="137" r="1.6" fill="#94A3B8" />
        <circle cx="130" cy="137" r="1.6" fill="#94A3B8" />
        <circle cx="136" cy="137" r="1.6" fill="#94A3B8" />
        <circle cx="142" cy="137" r="1.6" fill="#94A3B8" />
        <circle cx="148" cy="137" r="1.6" fill="#F59E0B" />

        {/* Vertical Screen Stand */}
        <rect x="132" y="115" width="8" height="14" fill="#0F172A" />

        {/* POS Touchscreen Monitor (Tilted Display) */}
        <rect x="114" y="94" width="44" height="28" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
        {/* Screen Bezel & Display Glow */}
        <rect x="117" y="97" width="38" height="22" rx="1.5" fill="#064E3B" />
        {/* POS Screen Content: Total Bill & Price Rp */}
        <rect x="120" y="100" width="22" height="3" fill="#34D399" rx="0.5" />
        <rect x="120" y="105" width="16" height="2.5" fill="#6EE7B7" rx="0.5" />
        <rect x="120" y="109" width="30" height="2.5" fill="#6EE7B7" rx="0.5" />
        <rect x="120" y="113" width="12" height="2.5" fill="#FDE047" rx="0.5" />

        {/* Receipt Printer Slot on top/side with printed paper receipt tape coming out */}
        <rect x="156" y="100" width="12" height="16" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
        <rect x="159" y="102" width="6" height="2" fill="#0F172A" />
        {/* Paper Receipt with zig-zag edge */}
        <path d="M160 103 L160 93 L161 94 L162 93 L163 94 L164 93 L164 103 Z" fill="#FFFFFF" />
        {/* Thermal print lines on receipt */}
        <line x1="161" y1="96" x2="163" y2="96" stroke="#0F172A" strokeWidth="0.8" />
        <line x1="161" y1="98" x2="163" y2="98" stroke="#0F172A" strokeWidth="0.8" />
        <line x1="161" y1="100" x2="163" y2="100" stroke="#0F172A" strokeWidth="0.8" />
      </g>

      {/* Kasir Right Hand operating the cash register touchscreen */}
      <circle cx="118" cy="120" r="5" fill="#F5B98A" />
      <path d="M120 119 L126 112" stroke="#F5B98A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function RoleSelectionScreen({
  userEmail,
  onSelectRole,
  onSignOut
}: RoleSelectionScreenProps) {
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none"
      id="role-selection-viewport"
    >
      {/* Ambient background lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header bar with user account & logout */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-lg">
            <img 
              src={logoImg} 
              alt="LaughDry Logo" 
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-sky-400 via-sky-200 to-white bg-clip-text text-transparent">
                LaughDry Hub
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Cloud Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sistem Manajemen & Kasir Laundry Terpadu
            </p>
          </div>
        </div>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Akun Terverifikasi</span>
            <span className="text-xs font-semibold text-slate-200 max-w-[180px] truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Keluar dari Akun"
            id="role-screen-signout-btn"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Choice Section */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-10 flex flex-col items-center justify-center relative z-10">
        
        {/* Title & Introduction */}
        <div className="text-center max-w-xl mx-auto space-y-1.5 sm:space-y-2.5 mb-4 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] sm:text-xs font-bold">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 animate-pulse" />
            <span>Login Berhasil</span>
          </div>
          <h1 className="text-lg sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            Pilih Akses Pengguna
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-400 leading-snug sm:leading-relaxed">
            Pilih peran di <span className="text-sky-300 font-bold">Kiri (Owner)</span> atau di <span className="text-emerald-300 font-bold">Kanan (Kasir)</span>:
          </p>
        </div>

        {/* Two Role Selection Cards - Berada di Kiri (Owner) atau Kanan (Kasir) pada tampilan mobile */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-6 md:gap-8 items-stretch max-w-4xl" id="role-selection-grid">
          
          {/* ======================================================== */}
          {/* OPSI KIRI: OWNER (ORANG DENGAN BUKU CATATAN DAN ALAT TULIS) */}
          {/* ======================================================== */}
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelectRole('owner')}
            className="group relative bg-slate-900/95 hover:bg-slate-900 border-2 border-slate-800 hover:border-sky-500 rounded-2xl sm:rounded-3xl p-3 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-sky-500/15 cursor-pointer overflow-hidden select-none active:border-sky-400"
            id="role-option-owner"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRole('owner');
              }
            }}
          >
            {/* Ambient accent top highlight */}
            <div className="absolute -top-16 -right-16 sm:-top-24 sm:-right-24 w-32 h-32 sm:w-48 sm:h-48 bg-sky-500/15 rounded-full blur-2xl sm:blur-3xl group-hover:bg-sky-500/25 transition-all" />

            <div className="space-y-2.5 sm:space-y-5 relative z-10">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <LayoutDashboard className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Kiri: Owner</span>
                </span>
                <span className="text-[9px] sm:text-xs font-bold text-slate-500 group-hover:text-sky-400 transition-colors hidden xs:inline">
                  Penuh
                </span>
              </div>

              {/* LOGO RESMI OWNER: ORANG DENGAN BUKU CATATAN DAN ALAT TULIS */}
              <div className="flex flex-col items-center justify-center py-1 sm:py-2">
                <div className="relative group-hover:scale-105 transition-transform duration-300">
                  <OwnerRoleIllustration className="w-20 h-20 sm:w-36 sm:h-36 md:w-44 md:h-44 drop-shadow-lg" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 sm:space-y-2 text-center">
                <h2 className="text-sm sm:text-2xl font-black text-white group-hover:text-sky-300 transition-colors">
                  Owner (Pemilik)
                </h2>
                <p className="text-[9.5px] sm:text-xs text-slate-400 leading-snug sm:leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                  Dasbor analitik keuangan, omset toko, tarif & kelola cabang.
                </p>
              </div>

              {/* Feature Points (ringkas di desktop) */}
              <ul className="hidden sm:space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300 font-medium sm:block">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Laporan laba rugi, omset & analitik</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Kelola akun kasir & tarif layanan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Pengaturan sistem & backup cloud</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-2 sm:pt-5 mt-2 sm:mt-5 border-t border-slate-800/80 relative z-10">
              <button
                type="button"
                className="w-full py-2 sm:py-3.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-500 group-hover:bg-sky-500 text-white font-black text-[10px] sm:text-sm tracking-wide transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-1 sm:gap-2 cursor-pointer"
              >
                <span>Masuk Owner</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </motion.div>

          {/* ==================================================================== */}
          {/* OPSI KANAN: KASIR (ORANG DENGAN MESIN KASIR DAN TUMPUKAN LAUNDRY)   */}
          {/* ==================================================================== */}
          <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelectRole('karyawan')}
            className="group relative bg-slate-900/95 hover:bg-slate-900 border-2 border-slate-800 hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-3 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/15 cursor-pointer overflow-hidden select-none active:border-emerald-400"
            id="role-option-cashier"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRole('karyawan');
              }
            }}
          >
            {/* Ambient accent top highlight */}
            <div className="absolute -top-16 -right-16 sm:-top-24 sm:-right-24 w-32 h-32 sm:w-48 sm:h-48 bg-emerald-500/15 rounded-full blur-2xl sm:blur-3xl group-hover:bg-emerald-500/25 transition-all" />

            <div className="space-y-2.5 sm:space-y-5 relative z-10">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Store className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Kanan: Kasir</span>
                </span>
                <span className="text-[9px] sm:text-xs font-bold text-slate-500 group-hover:text-emerald-400 transition-colors hidden xs:inline">
                  POS
                </span>
              </div>

              {/* LOGO RESMI KASIR: ORANG DENGAN MESIN KASIR DAN TUMPUKAN LAUNDRY */}
              <div className="flex flex-col items-center justify-center py-1 sm:py-2">
                <div className="relative group-hover:scale-105 transition-transform duration-300">
                  <CashierRoleIllustration className="w-20 h-20 sm:w-36 sm:h-36 md:w-44 md:h-44 drop-shadow-lg" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 sm:space-y-2 text-center">
                <h2 className="text-sm sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Kasir (Karyawan)
                </h2>
                <p className="text-[9.5px] sm:text-xs text-slate-400 leading-snug sm:leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                  Penerimaan cucian, cetak nota POS & pembayaran QRIS.
                </p>
              </div>

              {/* Feature Points (ringkas di desktop) */}
              <ul className="hidden sm:space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300 font-medium sm:block">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Input cucian kiloan & satuan otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cetak nota termal Bluetooth & WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pembayaran QRIS & absensi shift kasir</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-2 sm:pt-5 mt-2 sm:mt-5 border-t border-slate-800/80 relative z-10">
              <button
                type="button"
                className="w-full py-2 sm:py-3.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 group-hover:bg-emerald-500 text-white font-black text-[10px] sm:text-sm tracking-wide transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1 sm:gap-2 cursor-pointer"
              >
                <span>Masuk Kasir</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </motion.div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-4 text-center border-t border-slate-800/60 text-xs text-slate-500 relative z-10">
        <p>
          LaughDry Laundry POS &copy; 2026 &bull; Anda dapat berganti peran kapan saja melalui menu navigasi atas.
        </p>
      </footer>
    </div>
  );
}
