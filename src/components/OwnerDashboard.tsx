/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'motion/react';
import { downloadFinancialReportPDF, downloadDailyTransactionsPDF } from '../utils/pdfGenerator';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  FileText,
  Printer,
  Clock,
  Layers,
  MapPin,
  MessageSquare,
  Shield,
  Download,
  Upload,
  AlertTriangle,
  Play,
  RotateCcw,
  Coffee,
  Calendar,
  History,
  QrCode,
  Undo,
  Building,
  Phone,
  Smartphone,
  Globe,
  MoreVertical,
  Menu
} from 'lucide-react';
import { LaughDryDatabase } from '../data/mockDatabase';
import { LaundryService } from '../services/laundryService';
import { Service, Expense, Branch, Order, OrderStatus, AuditLog, WhatsAppTemplate, Customer, SettingsVersion } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const styleWorksheet = (ws: any) => {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Initialize col widths
  const colWidths: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    colWidths.push({ wch: 10 });
  }

  // Iterate over coordinates
  for (let R = range.s.r; R <= range.e.r; ++R) {
    // Scan current row first to check row-level status
    let isCanceledRow = false;
    let isUnpaidRow = false;
    let isCompletedRow = false;

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cell_ref];
      if (cell && cell.v !== undefined) {
        const valStr = String(cell.v).trim();
        if (valStr === 'Dibatalkan') {
          isCanceledRow = true;
        } else if (valStr === 'Belum Lunas') {
          isUnpaidRow = true;
        } else if (valStr === 'Selesai') {
          isCompletedRow = true;
        }
      }
    }

    // Determine if this row represents headers/labels or titles
    let isHeader = false;
    // Section headers style (first column value check)
    const firstCellVal = ws[XLSX.utils.encode_cell({ r: R, c: range.s.c })]?.v;
    const isSection = typeof firstCellVal === 'string' && /^[1-9]\.\s|^[A-Z\s]{10,}$/.test(firstCellVal.trim());

    // Check if any cell in the row matches header keywords
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cell_ref];
      if (cell && typeof cell.v === 'string') {
        const lowerVal = cell.v.toLowerCase();
        if (
          lowerVal === 'id_transaksi' || 
          lowerVal === 'no nota' || 
          lowerVal === 'no_nota' || 
          lowerVal === 'tanggal pembayaran' ||
          lowerVal === 'cabang' || 
          lowerVal === 'metode'
        ) {
          isHeader = true;
          break;
        }
      }
    }

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
      let cell = ws[cell_ref];
      
      if (!cell) {
        // Create empty cell if row-level tinting might be needed
        if (isCanceledRow || isUnpaidRow || isCompletedRow) {
          cell = { t: 's', v: '' };
          ws[cell_ref] = cell;
        } else {
          continue;
        }
      }

      // Calculate auto-fit columns
      const valStr = cell.v !== undefined ? String(cell.v) : '';
      if (valStr.length > colWidths[C - range.s.c].wch) {
        colWidths[C - range.s.c].wch = Math.min(valStr.length + 3, 40);
      }

      // Base cell style (font and grid borders)
      cell.s = {
        font: { name: 'Segoe UI', sz: 10, color: { rgb: '1F2937' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        }
      };

      if (isHeader) {
        // Styled as table header: Dark Gray slate with text bold white
        cell.s = {
          fill: { fgColor: { rgb: '374151' } }, // Dark charcoal/slate header
          font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '1F2937' } },
            bottom: { style: 'medium', color: { rgb: '111827' } },
            left: { style: 'thin', color: { rgb: '1F2937' } },
            right: { style: 'thin', color: { rgb: '1F2937' } }
          }
        };
      } else if (isSection) {
        // Styled as Section title or main report title
        cell.s = {
          font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '1E3A8A' } }, // Brand dark blue
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      } else {
        // Alignment adjustments based on type
        if (typeof cell.v === 'number') {
          cell.s.alignment.horizontal = 'right';
        }

        // Apply targeted styling according to cell status
        const valStrRaw = cell.v !== undefined ? String(cell.v).trim() : '';

        if (valStrRaw === 'Selesai') {
          cell.s.fill = { fgColor: { rgb: 'C6F6D5' } }; // Light Green Background (Sudah Selesai)
          cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '15803D' } }; // Dark Green Text
          cell.s.alignment.horizontal = 'center';
        } else if (valStrRaw === 'Belum Lunas') {
          cell.s.fill = { fgColor: { rgb: 'FEF3C7' } }; // Light Yellow Background (Belum Bayar/Belum Lunas)
          cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'B45309' } }; // Dark Yellow/Amber Text
          cell.s.alignment.horizontal = 'center';
        } else if (valStrRaw === 'Dibatalkan' || valStrRaw === 'Dihapus') {
          cell.s.fill = { fgColor: { rgb: 'FEE2E2' } }; // Light Red Background (Dihapus/Dibatalkan)
          cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'B91C1C' } }; // Dark Red Text
          cell.s.alignment.horizontal = 'center';
        } else if (valStrRaw === 'Lunas') {
          cell.s.fill = { fgColor: { rgb: 'E0F2FE' } }; // Light Blue Background
          cell.s.font = { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0369A1' } };
          cell.s.alignment.horizontal = 'center';
        } else {
          // Row tint style for non-status cells based on row status
          if (isCanceledRow) {
            cell.s.fill = { fgColor: { rgb: 'FEF2F2' } }; // Very soft light red row tint
          } else if (isUnpaidRow) {
            cell.s.fill = { fgColor: { rgb: 'FFFDF5' } }; // Very soft light yellow row tint
          } else if (isCompletedRow) {
            cell.s.fill = { fgColor: { rgb: 'F0FDF4' } }; // Very soft light green row tint
          }
        }
      }
    }
  }

  // Update actual columns widths
  ws['!cols'] = colWidths;
};

interface OwnerDashboardProps {
  onLogout?: () => void;
  onSwitchConsole?: (consoleType: any) => void;
}

export default function OwnerDashboard({ onLogout, onSwitchConsole }: OwnerDashboardProps = {}) {
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [services, setServices] = useState<Service[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [settings, setSettings] = useState(LaughDryDatabase.getSettings());
  const [settingsHistory, setSettingsHistory] = useState<SettingsVersion[]>(LaughDryDatabase.getSettingsHistory());
  const [newVersionNote, setNewVersionNote] = useState<string>('');
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [showReceiptPreviewPopup, setShowReceiptPreviewPopup] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Confirm states
  const [deleteConfirmService, setDeleteConfirmService] = useState<Service | null>(null);
  const [deleteConfirmCashier, setDeleteConfirmCashier] = useState<any | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  // Form states
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'kiloan' as 'kiloan' | 'satuan',
    price: 0,
    unit: 'kg',
    estimateHours: 48,
    workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'] as string[],
    promiseName: 'Reguler',
    promiseDurationVal: 2,
    promiseDurationUnit: 'Hari' as 'Hari' | 'Jam',
    sizeOption: 'Sedang' as string,
  });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Detergen/Softener' as any,
    amount: '',
    branchId: 'br-1',
    date: new Date().toISOString().split('T')[0],
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analytics: true,
    services: false,
    expenses: false,
    settings: false,
    cashiers: false,
    branches: false,
    attendance: false,
  });
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [isMenuAtBottom, setIsMenuAtBottom] = useState(false);
  const [isMenuAtRight, setIsMenuAtRight] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string>('analytics');

  // Custom inner sub-tab controllers
  const [analyticsInnerTab, setAnalyticsInnerTab] = useState<'financial' | 'monthly' | 'productivity'>('financial');
  const [servicesInnerTab, setServicesInnerTab] = useState<'rates' | 'perfumes'>('rates');
  const [ratesTab, setRatesTab] = useState<'kiloan' | 'satuan'>('kiloan');
  const [settingsInnerTab, setSettingsInnerTab] = useState<'general' | 'receipt' | 'wa'>('general');

  // Popup lists & Custom date trackers
  const [showMonthlyRevenueDetail, setShowMonthlyRevenueDetail] = useState<boolean>(false);
  const [showPaymentMethodDetail, setShowPaymentMethodDetail] = useState<boolean>(false);
  const [selectedActiveCashier, setSelectedActiveCashier] = useState<any | null>(null);
  
  // Date Picker ranges for popular payment methods (defaults to current month)
  const [paymentStartDate, setPaymentStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-01`;
  });
  const [paymentEndDate, setPaymentEndDate] = useState<string>(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  });

  // Perfume CRUD States
  const [perfumes, setPerfumes] = useState(() => LaughDryDatabase.getPerfumes());
  const [showAddPerfume, setShowAddPerfume] = useState<boolean>(false);
  const [editingPerfumeId, setEditingPerfumeId] = useState<string | null>(null);
  const [deleteConfirmPerfumeId, setDeleteConfirmPerfumeId] = useState<string | null>(null);
  const [perfumeForm, setPerfumeForm] = useState({ name: '', description: '', isActive: true, icon: '🌸' });

  // Touch Swipe Gesture State inside OwnerDashboard
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const SUBTABS = ['analytics', 'services', 'expenses', 'settings', 'cashiers', 'branches', 'attendance'];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Check horizontal swipe threshold (80px) and ensure direction is mostly X
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
      const curIdx = SUBTABS.indexOf(activeSubTab);
      if (diffX > 0) {
        // Swipe left -> Next tab
        const nextIdx = (curIdx + 1) % SUBTABS.length;
        setActiveSubTab(SUBTABS[nextIdx]);
      } else {
        // Swipe right -> Prev tab
        const prevIdx = (curIdx - 1 + SUBTABS.length) % SUBTABS.length;
        setActiveSubTab(SUBTABS[prevIdx]);
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const [reportStartDate, setReportStartDate] = useState<string>('2026-05-01');
  const [reportEndDate, setReportEndDate] = useState<string>('2026-06-30');
  const [expandedServiceGroup, setExpandedServiceGroup] = useState<string | null>(null);
  const [viewingServiceGroupName, setViewingServiceGroupName] = useState<string | null>(null);
  const [activePopupField, setActivePopupField] = useState<'category' | 'unit' | 'promiseDurationUnit' | 'sizeOption' | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showTodayTransactionsModal, setShowTodayTransactionsModal] = useState(false);
  const [showAccumulatedOmzetModal, setShowAccumulatedOmzetModal] = useState(false);
  const [accumulatedStartDate, setAccumulatedStartDate] = useState('2026-05-01');
  const [accumulatedEndDate, setAccumulatedEndDate] = useState('2026-06-30');
  const [showPiutangModal, setShowPiutangModal] = useState(false);
  const [showOPEXModal, setShowOPEXModal] = useState(false);
  const [opexFilterStartDate, setOpexFilterStartDate] = useState('2026-05-01');
  const [opexFilterEndDate, setOpexFilterEndDate] = useState('2026-06-30');
  const [users, setUsers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceStaffFilter, setAttendanceStaffFilter] = useState<string>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');

  // Owner form states
  const [showEditOwner, setShowEditOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    name: 'Andi Owner',
    username: 'owner',
    password: 'owner',
    email: 'owner@laughdry.co.id'
  });

  const getOwnerName = () => {
    const owner = users.find(u => u.role === 'owner');
    return owner ? owner.name : 'Andi Owner';
  };

  // Branch form states
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    latitude: '',
    longitude: '',
  });
  const [deleteConfirmBranch, setDeleteConfirmBranch] = useState<Branch | null>(null);

  // Cashier form states
  const [showAddCashier, setShowAddCashier] = useState(false);
  const [editingCashierId, setEditingCashierId] = useState<string | null>(null);
  const [cashierForm, setCashierForm] = useState({
    name: '',
    username: '',
    password: '',
    branchId: 'br-1',
  });

  const [expenseStartDate, setExpenseStartDate] = useState('2026-05-01');
  const [expenseEndDate, setExpenseEndDate] = useState('2026-06-30');
  const [selectedMonthlySummaryMonth, setSelectedMonthlySummaryMonth] = useState('2026-05');
  const [monthlyReportStartDate, setMonthlyReportStartDate] = useState('2026-06-01');
  const [monthlyReportEndDate, setMonthlyReportEndDate] = useState('2026-06-30');
  const [cashierDetailStartDate, setCashierDetailStartDate] = useState('2026-06-01');
  const [cashierDetailEndDate, setCashierDetailEndDate] = useState('2026-06-30');

  useEffect(() => {
    loadDatabaseState();

    // Request permissions for web notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Subscribe to Firestore push_notifications collection in real-time
    const unsubscribe = LaundryService.listenPushNotifications((notifs) => {
      // Find new, unread notifications for active sessions
      const unread = notifs.filter(n => !n.isRead);
      if (unread.length > 0) {
        unread.forEach(notif => {
          // Show local system native notifications
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(notif.title, {
                body: notif.body,
              });
            } catch (e) {
              console.error("Native notification delivery failed:", e);
            }
          }
          
          // Show elegant modal toast banner
          triggerToast(`🔔 FCM PUSH: ${notif.title}\n${notif.body}`);
        });

        // Toggle read statuses
        try {
          LaundryService.markNotificationsAsRead(unread);
        } catch (e) {
          console.error("Error marking push status read:", e);
        }
      }
    });

    const handleDbUpdate = () => {
      loadDatabaseState();
    };
    window.addEventListener('laughdry_db_synced', handleDbUpdate);
    window.addEventListener('laughdry_data_changed', handleDbUpdate);
    window.addEventListener('laughdry_perfumes_updated', handleDbUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('laughdry_db_synced', handleDbUpdate);
      window.removeEventListener('laughdry_data_changed', handleDbUpdate);
      window.removeEventListener('laughdry_perfumes_updated', handleDbUpdate);
    };
  }, []);

  const loadDatabaseState = () => {
    setServices(LaughDryDatabase.getServices());
    setExpenses(LaughDryDatabase.getExpenses());
    setOrders(LaughDryDatabase.getOrders());
    setCustomers(LaughDryDatabase.getCustomers());
    const dbUsers = LaughDryDatabase.getUsers();
    setUsers(dbUsers);
    setPerfumes(LaughDryDatabase.getPerfumes());

    // Find owner in the database and set form values
    const owner = dbUsers.find(u => u.role === 'owner');
    if (owner) {
      setOwnerForm({
        name: owner.name,
        username: owner.username,
        password: owner.password || 'owner',
        email: owner.email || 'owner@laughdry.co.id'
      });
    }

    setBranches(LaughDryDatabase.getBranches());
    setAuditLogs(LaughDryDatabase.getAuditLogs());
    setTemplates(LaughDryDatabase.getTemplates());
    setSettings(LaughDryDatabase.getSettings());
    setSettingsHistory(LaughDryDatabase.getSettingsHistory());
    setAttendanceRecords(LaughDryDatabase.getAttendance());
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Service CRUD
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const currentServices = [...services];
    
    const isSatuan = serviceForm.category === 'satuan';
    const computedHours = isSatuan ? 0 : (serviceForm.promiseDurationUnit === 'Hari' 
      ? Number(serviceForm.promiseDurationVal) * 24 
      : Number(serviceForm.promiseDurationVal));

    const durationText = isSatuan ? '' : `${serviceForm.promiseDurationVal} ${serviceForm.promiseDurationUnit}`;
    const finalPromiseName = isSatuan ? serviceForm.sizeOption : serviceForm.promiseName;

    if (editingServiceId) {
      const idx = currentServices.findIndex(s => s.id === editingServiceId);
      if (idx !== -1) {
        currentServices[idx] = {
          ...currentServices[idx],
          name: serviceForm.name,
          category: serviceForm.category,
          price: Number(serviceForm.price),
          unit: serviceForm.unit,
          estimateHours: computedHours,
          workflowSteps: serviceForm.workflowSteps,
          promiseName: finalPromiseName,
          promiseDurationText: durationText,
        };
        LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'SERVICE_UPDATE', `Mengubah layanan [${serviceForm.name}] taraf Rp ${serviceForm.price}`);
      }
    } else {
      const newSrv: Service = {
        id: `srv-${Date.now()}`,
        name: serviceForm.name,
        category: serviceForm.category,
        price: Number(serviceForm.price),
        unit: serviceForm.unit,
        estimateHours: computedHours,
        isActive: true,
        workflowSteps: serviceForm.workflowSteps,
        promiseName: finalPromiseName,
        promiseDurationText: durationText,
      };
      currentServices.push(newSrv);
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'SERVICE_CREATE', `Membuat layanan baru [${serviceForm.name}] taraf Rp ${serviceForm.price}`);
    }

    LaughDryDatabase.saveServices(currentServices);
    setServices(currentServices);
    setShowAddService(false);
    setEditingServiceId(null);
    setServiceForm({ 
      name: '', 
      category: 'kiloan', 
      price: 0, 
      unit: 'kg', 
      estimateHours: 48, 
      workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'],
      promiseName: 'Reguler',
      promiseDurationVal: 2,
      promiseDurationUnit: 'Hari',
      sizeOption: 'Sedang'
    });
    loadDatabaseState();
    triggerToast("Layanan berhasil disimpan ke PostgreSQL!");
  };

  const startEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    
    let initialVal = 2;
    let initialUnit: 'Hari' | 'Jam' = 'Hari';
    if (srv.promiseDurationText) {
      const parts = srv.promiseDurationText.split(' ');
      const val = parseInt(parts[0]);
      if (!isNaN(val)) {
        initialVal = val;
        if (parts[1]?.toLowerCase().startsWith('jam')) {
          initialUnit = 'Jam';
        }
      }
    } else {
      if (srv.estimateHours % 24 === 0) {
        initialVal = srv.estimateHours / 24;
        initialUnit = 'Hari';
      } else {
        initialVal = srv.estimateHours;
        initialUnit = 'Jam';
      }
    }

    setServiceForm({
      name: srv.name,
      category: srv.category,
      price: srv.price,
      unit: srv.unit,
      estimateHours: srv.estimateHours,
      workflowSteps: srv.workflowSteps || ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'],
      promiseName: srv.category === 'satuan' ? 'Reguler' : (srv.promiseName || 'Reguler'),
      promiseDurationVal: initialVal,
      promiseDurationUnit: initialUnit,
      sizeOption: srv.category === 'satuan' ? (srv.promiseName || 'Sedang') : 'Sedang'
    });
    setShowAddService(true);
  };

  const executeDeleteService = (id: string) => {
    const srv = services.find(s => s.id === id);
    if (!srv) return;
    const updated = services.map(s => s.id === id ? { ...s, isActive: false } : s);
    LaughDryDatabase.saveServices(updated);
    setServices(updated);
    LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'SERVICE_DEACTIVATE', `Menonaktifkan layanan [${srv.name}]`);
    setDeleteConfirmService(null);
    loadDatabaseState();
    triggerToast("Layanan berhasil dinonaktifkan!");
  };

  const startEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({
      description: exp.description,
      category: exp.category as any,
      amount: exp.amount.toString(),
      branchId: exp.branchId || 'br-1',
      date: exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowAddExpense(true);
  };

  const executeDeleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    const updated = expenses.filter(e => e.id !== id);
    LaughDryDatabase.saveExpenses(updated);
    setExpenses(updated);
    LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'EXPENSE_DELETE', `Menghapus pengeluaran [${exp.description}]`);
    setDeleteConfirmExpense(null);
    loadDatabaseState();
    triggerToast("Catatan pengeluaran berhasil dihapus!");
  };

  // Expense Create & Update
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentExpenses = [...expenses];
    const amountSanitized = String(expenseForm.amount).replace(/[,.]/g, '');
    const amountVal = parseFloat(amountSanitized);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Masukkan nominal rupiah pengeluaran yang valid!");
      return;
    }
    
    if (editingExpenseId) {
      const idx = currentExpenses.findIndex(ex => ex.id === editingExpenseId);
      if (idx !== -1) {
        currentExpenses[idx] = {
          ...currentExpenses[idx],
          description: expenseForm.description,
          category: expenseForm.category,
          amount: amountVal,
          branchId: expenseForm.branchId,
          date: expenseForm.date ? new Date(expenseForm.date).toISOString() : currentExpenses[idx].date,
        };
        LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'EXPENSE_UPDATE', `Mengubah pengeluaran [${expenseForm.description}] sebesar Rp ${amountVal}`);
      }
      setEditingExpenseId(null);
    } else {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        description: expenseForm.description,
        category: expenseForm.category,
        amount: amountVal,
        branchId: expenseForm.branchId,
        date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
        recordedBy: 'Andi Owner',
      };
      currentExpenses.unshift(newExp);
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'EXPENSE_RECORD', `Mencatat pengeluaran [${expenseForm.description}] sebesar Rp ${amountVal}`);
    }

    LaughDryDatabase.saveExpenses(currentExpenses);
    setExpenses(currentExpenses);
    setShowAddExpense(false);
    setExpenseForm({ description: '', category: 'Detergen/Softener', amount: '', branchId: 'br-1', date: new Date().toISOString().split('T')[0] });
    loadDatabaseState();
    triggerToast("Pengeluaran operasional berhasil disimpan!");
  };

  // Cashier CRUD
  const handleSaveCashier = (e: React.FormEvent) => {
    e.preventDefault();
    const currentUsers = [...LaughDryDatabase.getUsers()];

    if (editingCashierId) {
      const idx = currentUsers.findIndex(u => u.id === editingCashierId);
      if (idx !== -1) {
        currentUsers[idx] = {
          ...currentUsers[idx],
          name: cashierForm.name,
          username: cashierForm.username,
          password: cashierForm.password,
          branchId: cashierForm.branchId,
        };
        LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'USER_UPDATE', `Mengubah akun kasir [${cashierForm.username}]`);
      }
    } else {
      if (currentUsers.some(u => u.username.toLowerCase() === cashierForm.username.toLowerCase())) {
        alert("Username kasir sudah digunakan!");
        return;
      }
      const newCashier = {
        id: `usr-${Date.now()}`,
        name: cashierForm.name,
        role: 'karyawan' as const,
        email: `${cashierForm.username}@laughdry.co.id`,
        username: cashierForm.username,
        password: cashierForm.password,
        branchId: cashierForm.branchId,
      };
      currentUsers.push(newCashier);
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'USER_CREATE', `Membuat akun kasir baru [${cashierForm.username}] untuk cabang ${cashierForm.branchId}`);
    }

    LaughDryDatabase.saveUsers(currentUsers);
    setUsers(currentUsers);
    setShowAddCashier(false);
    setEditingCashierId(null);
    setCashierForm({ name: '', username: '', password: '', branchId: 'br-1' });
    loadDatabaseState();
    triggerToast("Akun kasir berhasil disimpan!");
  };

  const startEditCashier = (u: any) => {
    setEditingCashierId(u.id);
    setCashierForm({
      name: u.name,
      username: u.username,
      password: u.password || '',
      branchId: u.branchId || 'br-1',
    });
    setShowAddCashier(true);
  };

  const executeDeleteCashier = (id: string) => {
    if (id === 'usr-1') {
      alert("Tidak dapat menghapus akun owner!");
      return;
    }
    const userToDel = users.find(u => u.id === id);
    if (!userToDel) return;
    const currentUsers = LaughDryDatabase.getUsers().filter(u => u.id !== id);
    LaughDryDatabase.saveUsers(currentUsers);
    setUsers(currentUsers);
    LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'USER_DELETE', `Menghapus akun kasir [${userToDel.username}]`);
    setDeleteConfirmCashier(null);
    loadDatabaseState();
    triggerToast("Akun kasir berhasil dihapus!");
  };

  const handleSaveOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.name.trim() || !ownerForm.username.trim() || !ownerForm.password.trim() || !ownerForm.email.trim()) {
      triggerToast("Semua kolom profil owner harus diisi!");
      return;
    }

    const currentUsers = [...users];
    const ownerIndex = currentUsers.findIndex(u => u.role === 'owner');
    
    if (ownerIndex !== -1) {
      const updatedOwner = {
        ...currentUsers[ownerIndex],
        name: ownerForm.name.trim(),
        username: ownerForm.username.trim().toLowerCase().replace(/\s/g, ''),
        password: ownerForm.password.trim(),
        email: ownerForm.email.trim()
      };
      currentUsers[ownerIndex] = updatedOwner;
      
      LaughDryDatabase.saveUsers(currentUsers);
      setUsers(currentUsers);
      
      // Persist to Live Firestore database immediately
      LaundryService.saveFirestoreUser(updatedOwner).catch(err => {
        console.error("Gagal sinkronasi owner ke Firestore:", err);
      });
      
      LaughDryDatabase.logActivity('usr-1', updatedOwner.name, 'owner', 'OWNER_PROFILE_UPDATE', `Mengubah profil owner menjadi [${updatedOwner.name}]`);
      triggerToast("✅ Profil & Hak Akses Owner berhasil disimpan ke Database Live!");
      setShowEditOwner(false);
    } else {
      triggerToast("Gagal menemukan akun owner di database!");
    }
  };

  const handleTogglePermission = (employeeId: string, permission: string) => {
    const currentUsers = [...users];
    const idx = currentUsers.findIndex(usr => usr.id === employeeId);
    if (idx !== -1) {
      const employee = currentUsers[idx];
      const prevPerms = employee.permissions || [];
      let updatedPerms: string[] = [];
      if (prevPerms.includes(permission)) {
        updatedPerms = prevPerms.filter((p: string) => p !== permission);
      } else {
        updatedPerms = [...prevPerms, permission];
      }
      const updatedEmployee = { ...employee, permissions: updatedPerms };
      currentUsers[idx] = updatedEmployee;
      
      LaughDryDatabase.saveUsers(currentUsers);
      setUsers(currentUsers);
      
      // Push the updated employee document directly into Firebase Firestore
      LaundryService.saveFirestoreUser(updatedEmployee).catch(err => {
        console.error("Gagal update izin karyawan di Firestore:", err);
      });
      
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'STAFF_PERMS_UPDATE', `Mengubah hak akses staf [${employee.name}]: ${updatedPerms.join(', ') || 'tidak ada'}`);
      triggerToast(`✅ Hak akses ${employee.name} berhasil diperbarui di database!`);
    }
  };

  // Branch database event handlers
  const detectBranchGPS = () => {
    if (!navigator.geolocation) {
      triggerToast("❌ Peramban ini tidak mendukung Layanan GPS Geolocation.");
      return;
    }
    triggerToast("📍 Sedang memindai lokasi satelit GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranchForm(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        triggerToast("✅ Lokasi GPS Cabang Berhasil Dideteksi!");
      },
      (error) => {
        console.error("Gagal mendeteksi lokasi GPS:", error);
        triggerToast("❌ Gagal memindai GPS: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !branchForm.address.trim() || !branchForm.phone.trim()) {
      triggerToast("Semua kolom harus diisi!");
      return;
    }

    const latVal = branchForm.latitude ? parseFloat(branchForm.latitude) : undefined;
    const lngVal = branchForm.longitude ? parseFloat(branchForm.longitude) : undefined;

    let updatedBranches = [...branches];
    if (editingBranchId) {
      // Edit mode
      updatedBranches = updatedBranches.map(b => 
        b.id === editingBranchId ? { 
          ...b, 
          name: branchForm.name.trim(), 
          address: branchForm.address.trim(), 
          phone: branchForm.phone.trim(),
          latitude: latVal,
          longitude: lngVal
        } : b
      );
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'BRANCH_UPDATE', `Mengubah informasi cabang [${branchForm.name}] berpeta GPS`);
      triggerToast("✅ Informasi cabang berhasil diubah!");
    } else {
      // Create mode
      const newId = `br-${Date.now()}`;
      const newBranch: Branch = {
        id: newId,
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        latitude: latVal,
        longitude: lngVal
      };
      updatedBranches.push(newBranch);
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'BRANCH_CREATE', `Menambahkan cabang baru [${branchForm.name}] perpeta GPS`);
      triggerToast("✅ Cabang baru berhasil ditambahkan!");
    }

    LaughDryDatabase.saveBranches(updatedBranches);
    setBranches(updatedBranches);
    setBranchForm({ name: '', address: '', phone: '', latitude: '', longitude: '' });
    setShowAddBranch(false);
    setEditingBranchId(null);
  };

  const startEditBranch = (b: Branch) => {
    setBranchForm({ 
      name: b.name, 
      address: b.address, 
      phone: b.phone,
      latitude: b.latitude ? b.latitude.toString() : '',
      longitude: b.longitude ? b.longitude.toString() : ''
    });
    setEditingBranchId(b.id);
    setShowAddBranch(true);
  };

  const executeDeleteBranch = () => {
    if (!deleteConfirmBranch) return;
    const updatedBranches = branches.filter(b => b.id !== deleteConfirmBranch.id);
    LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'BRANCH_DELETE', `Menghapus cabang [${deleteConfirmBranch.name}]`);
    
    LaughDryDatabase.saveBranches(updatedBranches);
    setBranches(updatedBranches);
    setDeleteConfirmBranch(null);
    triggerToast("🗑️ Cabang berhasil dihapus!");
  };

  // Reset Simulator Data State
  const [showResetDbConfirm, setShowResetDbConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const executeResetDatabase = async () => {
    try {
      setIsResetting(true);
      await LaughDryDatabase.purgeAllDatabaseData();
      await loadDatabaseState();
      LaughDryDatabase.logActivity('usr-1', 'Andi Owner', 'owner', 'SYSTEM_RESET', 'Mengosongkan sistem dan database live untuk persiapan rilis produksi gratis dari dummy data.');
      setShowResetDbConfirm(false);
      triggerToast("🧹 Database bersih diinisialisasi! Aplikasi siap diluncurkan.");
    } catch (err) {
      triggerToast("❌ Gagal membersihkan database live.");
    } finally {
      setIsResetting(false);
    }
  };

  // Backup file export simulator
  const handleExportBackup = () => {
    const backupStr = LaughDryDatabase.generateBackupJSONString();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(backupStr);
    const exportFileDefaultName = `laughdry_postgresql_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'DATABASE_BACKUP', 'Melakukan ekspor backup database PostgreSQL (.json)');
    triggerToast("File Backup PostgreSQL berhasil diunduh!");
  };

  const handleExportExcel = () => {
    if (orders.length === 0) {
      triggerToast("⚠️ Tidak ada data transaksi untuk diekspor!");
      return;
    }

    const headers = [
      "ID_Transaksi",
      "No_Nota",
      "ID_Pelanggan",
      "Nama_Pelanggan",
      "No_HP_Pelanggan",
      "ID_Cabang",
      "Total_Tagihan",
      "Metode_Pembayaran",
      "Status_Pembayaran",
      "Status_Cucian",
      "Catatan",
      "Dibuat_Pada",
      "Diubah_Pada",
      "Estimasi_Selesai",
      "Selesai_Pada",
      "Poin_Didapat",
      "Poin_Ditukar",
      "Aroma_Parfum",
      "ID_Kasir",
      "Nama_Kasir",
      "Rincian_Item_JSON"
    ];

    const dataRows = orders.map(order => [
      order.id,
      order.invoiceNumber,
      order.customerId,
      order.customerName,
      order.customerPhone,
      order.branchId,
      order.totalAmount,
      order.paymentMethod,
      order.paymentStatus,
      order.status,
      order.notes,
      order.createdAt,
      order.updatedAt,
      order.estimatedCompletion,
      order.completedAt,
      order.pointsEarned,
      order.pointsRedeemed || 0,
      order.perfume,
      order.cashierId,
      order.cashierName,
      JSON.stringify(order.items)
    ]);

    const data = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    styleWorksheet(ws);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Transaksi");

    XLSX.writeFile(wb, `laughdry_transaksi_export_${new Date().toISOString().split('T')[0]}.xlsx`);

    LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'EXPORT_EXCEL', `Mengekspor ${orders.length} riwayat transaksi ke format Excel`);
    triggerToast(`✅ Berhasil mengekspor ${orders.length} transaksi ke Excel!`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          triggerToast("⚠️ File kosong atau tidak valid!");
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert Sheet to JSON Array of Arrays
        const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (sheetData.length < 2) {
          triggerToast("⚠️ Format Excel tidak valid (Kurang dari 2 baris)!");
          return;
        }

        const headers = sheetData[0].map((h: any) => String(h || "").trim());
        const idIdx = headers.indexOf("ID_Transaksi");
        const invIdx = headers.indexOf("No_Nota");
        const custIdIdx = headers.indexOf("ID_Pelanggan");
        const custNameIdx = headers.indexOf("Nama_Pelanggan");
        const custPhoneIdx = headers.indexOf("No_HP_Pelanggan");
        const branchIdIdx = headers.indexOf("ID_Cabang");
        const totalIdx = headers.indexOf("Total_Tagihan");
        const payMethodIdx = headers.indexOf("Metode_Pembayaran");
        const payStatusIdx = headers.indexOf("Status_Pembayaran");
        const statusIdx = headers.indexOf("Status_Cucian");
        const notesIdx = headers.indexOf("Catatan");
        const createdIdx = headers.indexOf("Dibuat_Pada");
        const updatedIdx = headers.indexOf("Diubah_Pada");
        const estIdx = headers.indexOf("Estimasi_Selesai");
        const complIdx = headers.indexOf("Selesai_Pada");
        const ptsEarnIdx = headers.indexOf("Poin_Didapat");
        const ptsRedIdx = headers.indexOf("Poin_Ditukar");
        const perfumeIdx = headers.indexOf("Aroma_Parfum");
        const cashierIdIdx = headers.indexOf("ID_Kasir");
        const cashierNameIdx = headers.indexOf("Nama_Kasir");
        const itemsJsonIdx = headers.indexOf("Rincian_Item_JSON");

        if (invIdx === -1 || custNameIdx === -1 || totalIdx === -1) {
          triggerToast("Format kolom Excel salah! Pastikan kolom 'No_Nota', 'Nama_Pelanggan', dan 'Total_Tagihan' tersedia.");
          return;
        }

        const importedOrders: Order[] = [];
        
        for (let k = 1; k < sheetData.length; k++) {
          const cols = sheetData[k];
          if (!cols || cols.length === 0) continue;
          if (!cols[invIdx]) continue; // Skip line without invoice number

          const orderId = (idIdx !== -1 && cols[idIdx]) ? String(cols[idIdx]) : `ord-${Date.now()}-${k}`;
          const invoiceNumber = String(cols[invIdx]);
          const customerId = (custIdIdx !== -1 && cols[custIdIdx]) ? String(cols[custIdIdx]) : `imported-cust-${k}`;
          const customerName = String(cols[custNameIdx] || "");
          const customerPhone = (custPhoneIdx !== -1 && cols[custPhoneIdx]) ? String(cols[custPhoneIdx]) : "";
          const branchId = (branchIdIdx !== -1 && cols[branchIdIdx]) ? String(cols[branchIdIdx]) : "br-1";
          const totalAmount = Number(cols[totalIdx]) || 0;
          const paymentMethod = ((payMethodIdx !== -1 && cols[payMethodIdx]) ? String(cols[payMethodIdx]) : "Cash") as any;
          const paymentStatus = ((payStatusIdx !== -1 && cols[payStatusIdx]) ? String(cols[payStatusIdx]) : "Lunas") as any;
          const status = ((statusIdx !== -1 && cols[statusIdx]) ? String(cols[statusIdx]) : "Selesai") as any;
          const notes = (notesIdx !== -1 && cols[notesIdx]) ? String(cols[notesIdx]) : "";
          const createdAt = (createdIdx !== -1 && cols[createdIdx]) ? String(cols[createdIdx]) : new Date().toISOString();
          const updatedAt = (updatedIdx !== -1 && cols[updatedIdx]) ? String(cols[updatedIdx]) : new Date().toISOString();
          const estimatedCompletion = (estIdx !== -1 && cols[estIdx]) ? String(cols[estIdx]) : new Date().toISOString();
          const completedAt = (complIdx !== -1 && cols[complIdx]) ? String(cols[complIdx]) : undefined;
          const pointsEarned = ptsEarnIdx !== -1 ? (Number(cols[ptsEarnIdx]) || 0) : 0;
          const pointsRedeemed = ptsRedIdx !== -1 ? (Number(cols[ptsRedIdx]) || 0) : undefined;
          const perfume = (perfumeIdx !== -1 && cols[perfumeIdx]) ? cols[perfumeIdx] as any : undefined;
          const cashierId = (cashierIdIdx !== -1 && cols[cashierIdIdx]) ? String(cols[cashierIdIdx]) : undefined;
          const cashierName = (cashierNameIdx !== -1 && cols[cashierNameIdx]) ? String(cols[cashierNameIdx]) : undefined;
          
          let items: any[] = [];
          if (itemsJsonIdx !== -1 && cols[itemsJsonIdx]) {
            try {
              items = JSON.parse(String(cols[itemsJsonIdx]));
            } catch {
              items = [{
                id: `item-${Date.now()}-${k}`,
                serviceId: "srv-1",
                serviceName: "Layanan Hasil Import Excel",
                price: totalAmount,
                quantity: 1,
                subtotal: totalAmount
              }];
            }
          } else {
            items = [{
              id: `item-${Date.now()}-${k}`,
              serviceId: "srv-1",
              serviceName: "Cuci Satuan Kiloan",
              price: totalAmount,
              quantity: 1,
              subtotal: totalAmount
            }];
          }

          const newOrder: Order = {
            id: orderId,
            invoiceNumber,
            customerId,
            customerName,
            customerPhone,
            branchId,
            items,
            totalAmount,
            paymentMethod,
            paymentStatus,
            status,
            notes,
            createdAt,
            updatedAt,
            estimatedCompletion,
            completedAt,
            pointsEarned,
            pointsRedeemed,
            perfume,
            cashierId,
            cashierName
          };
          importedOrders.push(newOrder);
        }

        if (importedOrders.length === 0) {
          triggerToast("⚠️ Tidak ada data valid yang bisa diimpor.");
          return;
        }

        const currentOrders = [...orders];
        let importCount = 0;
        
        importedOrders.forEach(imp => {
          const existsIdx = currentOrders.findIndex(o => o.id === imp.id || o.invoiceNumber === imp.invoiceNumber);
          if (existsIdx !== -1) {
            currentOrders[existsIdx] = imp;
          } else {
            currentOrders.push(imp);
            importCount++;
          }
        });

        LaughDryDatabase.saveOrders(currentOrders);
        setOrders(currentOrders);

        const currentCustomers = [...customers];
        let addedCustomers = 0;
        importedOrders.forEach(imp => {
          const custExists = currentCustomers.some(c => c.id === imp.customerId || c.phone === imp.customerPhone);
          if (!custExists && imp.customerName) {
            const newCust: Customer = {
              id: imp.customerId,
              name: imp.customerName,
              phone: imp.customerPhone,
              address: "Hasil Import Excel",
              depositBalance: 0,
              loyaltyPoints: 0,
              createdAt: imp.createdAt,
              lastActive: imp.updatedAt
            };
            currentCustomers.push(newCust);
            addedCustomers++;
          }
        });
        if (addedCustomers > 0) {
          LaughDryDatabase.saveCustomers(currentCustomers);
          setCustomers(currentCustomers);
        }

        LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'IMPORT_EXCEL', `Mengimpor ${importedOrders.length} transaksi dari file Excel`);
        triggerToast(`🎉 Sukses memproses ${importedOrders.length} transaksi Excel (${importCount} baru, ${importedOrders.length - importCount} update) & ${addedCustomers} pelanggan baru!`);
        
        if (e.target) {
          e.target.value = "";
        }
      } catch (err: any) {
        console.error(err);
        triggerToast(`⚠️ Gagal mengimpor file Excel: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTemplateChange = (id: string, body: string) => {
    const updated = templates.map(t => t.id === id ? { ...t, body } : t);
    LaughDryDatabase.saveTemplates(updated);
    setTemplates(updated);
    triggerToast("Template WhatsApp berhasil disimpan!");
  };

  const handleSettingsChange = (field: string, val: any) => {
    const updated = { ...settings, [field]: val };
    LaughDryDatabase.saveSettings(updated);
    setSettings(updated);
  };

  // CALCULATIONS (with branch filters)
  const filteredOrders = orders.filter(o => selectedBranch === 'all' || o.branchId === selectedBranch);
  const filteredExpenses = expenses.filter(e => {
    const branchMatch = selectedBranch === 'all' || e.branchId === selectedBranch;
    if (!branchMatch) return false;
    
    // Check Date Range if set
    const expenseDateOnly = e.date.split('T')[0];
    if (expenseStartDate && expenseDateOnly < expenseStartDate) return false;
    if (expenseEndDate && expenseDateOnly > expenseEndDate) return false;
    
    return true;
  });

  // Core indicators
  const totalOmzet = filteredOrders
    .filter(o => o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalPiutang = filteredOrders
    .filter(o => o.paymentStatus !== 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const activeOrdersCount = filteredOrders.filter(o => o.status !== OrderStatus.SELESAI && o.status !== OrderStatus.DIBATALKAN).length;
  const completedOrdersCount = filteredOrders.filter(o => o.status === OrderStatus.SELESAI).length;
  
  const totalOPEX = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const labaKotor = totalOmzet; // Revenue riil
  const labaBersih = totalOmzet - totalOPEX;

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const hasOrdersToday = filteredOrders.some(o => o.createdAt.startsWith(todayDateStr));
  const activeTodayStr = hasOrdersToday ? todayDateStr : '2026-05-30';

  const orderHariIniCount = filteredOrders.filter(o => o.createdAt.startsWith(activeTodayStr)).length;
  const omzetHariIni = filteredOrders
    .filter(o => (o.paymentDate || o.createdAt).startsWith(activeTodayStr) && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const piutangHariIni = filteredOrders
    .filter(o => o.createdAt.startsWith(activeTodayStr) && o.paymentStatus !== 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Business Intelligence Forecasting (Linear Regression trend)
  // Let's analyze omzet of 28th, 29th, 30th May 2026 to output standard forecast
  const getOmzetByDate = (dateStr: string) => {
    return filteredOrders
      .filter(o => (o.paymentDate || o.createdAt).startsWith(dateStr) && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
      .reduce((sum, o) => sum + o.totalAmount, 0);
  };

  const o28 = getOmzetByDate('2026-05-28');
  const o29 = getOmzetByDate('2026-05-29');
  const o30 = getOmzetByDate('2026-05-30');

  // Simple Trend Projection: y = ax + b
  // let x = 1 (28 May), 2 (29 May), 3 (30 May). Forecast for x = 4 (31 May)
  // Fit slope using linear trend of indices 1,2,3
  const meanX = 2;
  const meanY = (o28 + o29 + o30) / 3;
  const slopeNumerator = (1 - meanX) * (o28 - meanY) + (2 - meanX) * (o29 - meanY) + (3 - meanX) * (o30 - meanY);
  const slopeDenominator = (1 - meanX) ** 2 + (2 - meanX) ** 2 + (3 - meanX) ** 2;
  const slope = slopeDenominator !== 0 ? slopeNumerator / slopeDenominator : 0;
  const intercept = meanY - slope * meanX;
  const projectedOmzetEsok = Math.max(0, Math.round(slope * 4 + intercept));

  // Customer retention
  const inactiveCustomers = customers.filter(c => {
    const elapsedDays = (new Date('2026-05-30').getTime() - new Date(c.lastActive).getTime()) / (1000 * 60 * 60 * 24);
    return elapsedDays > 90; // > 3 months
  });

  const activeCustomersCount = customers.length - inactiveCustomers.length;

  // Group services by Name
  const groupedServices = React.useMemo(() => {
    const activeServices = services.filter(s => s.isActive);
    const groups: { [name: string]: Service[] } = {};
    activeServices.forEach(s => {
      if (!groups[s.name]) {
        groups[s.name] = [];
      }
      groups[s.name].push(s);
    });
    return groups;
  }, [services]);

  // Real-time Cashier Performance Calculation
  const cashierMetricsData = React.useMemo(() => {
    const cashierMap: { [key: string]: { id: string; name: string; username: string; totalRevenue: number; transactionCount: number; avatar: string } } = {};

    // 1. Initialise existing kasir users
    users.forEach(u => {
      if (u.role === 'karyawan') {
        cashierMap[u.id] = {
          id: u.id,
          name: u.name,
          username: u.username || u.name.split(' ')[0].toLowerCase(),
          totalRevenue: 0,
          transactionCount: 0,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.name)}`,
        };
      }
    });

    // 2. Aggregate from orders
    orders.forEach(o => {
      if (o.status !== OrderStatus.DIBATALKAN) {
        const cashierId = o.cashierId || 'usr-2'; // Default to Rian
        const cashierName = o.cashierName || 'Rian Karyawan';

        if (!cashierMap[cashierId]) {
          cashierMap[cashierId] = {
            id: cashierId,
            name: cashierName,
            username: cashierName.split(' ')[0].toLowerCase(),
            totalRevenue: 0,
            transactionCount: 0,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cashierName)}`,
          };
        }

        cashierMap[cashierId].totalRevenue += o.totalAmount;
        cashierMap[cashierId].transactionCount += 1;
      }
    });

    return Object.values(cashierMap);
  }, [orders, users]);

  // Real-time Selected Month Transactions List for Detail Popup
  const monthlyTransactions = React.useMemo(() => {
    const start = monthlyReportStartDate;
    const end = monthlyReportEndDate + "T23:59:59";
    return filteredOrders.filter(o => {
      if (o.status === OrderStatus.DIBATALKAN) return false;
      const paymentTime = o.paymentDate || o.createdAt;
      return paymentTime >= start && paymentTime <= end;
    });
  }, [monthlyReportStartDate, monthlyReportEndDate, filteredOrders]);

  // Payment Method Breakdown and Top Popular Method based on custom Date Picker Range
  const popularPaymentMethodStats = React.useMemo(() => {
    const methodCounts: { [key: string]: { count: number; totalAmount: number } } = {
      'Cash': { count: 0, totalAmount: 0 },
      'QRIS': { count: 0, totalAmount: 0 },
      'Transfer': { count: 0, totalAmount: 0 },
      'Deposit': { count: 0, totalAmount: 0 }
    };

    const start = paymentStartDate ? new Date(paymentStartDate + "T00:00:00") : null;
    const end = paymentEndDate ? new Date(paymentEndDate + "T23:59:59") : null;

    let inRangeTransactionsCount = 0;

    filteredOrders.forEach(o => {
      if (o.status === OrderStatus.DIBATALKAN || o.paymentStatus !== 'Lunas') return;
      const oDate = new Date(o.createdAt);
      if (start && oDate < start) return;
      if (end && oDate > end) return;

      const pm = o.paymentMethod || 'Cash';
      if (!methodCounts[pm]) {
        methodCounts[pm] = { count: 0, totalAmount: 0 };
      }
      methodCounts[pm].count++;
      methodCounts[pm].totalAmount += o.totalAmount;
      inRangeTransactionsCount++;
    });

    let bestMethod = 'Cash';
    let maxCount = -1;
    Object.keys(methodCounts).forEach(m => {
      if (methodCounts[m].count > maxCount) {
        maxCount = methodCounts[m].count;
        bestMethod = m;
      }
    });

    return {
      bestMethod,
      maxCount,
      allMethods: methodCounts,
      totalCount: inRangeTransactionsCount
    };
  }, [filteredOrders, paymentStartDate, paymentEndDate]);

  // Real-time Monthly Financial Summary Data
  const monthlyRevenueData = React.useMemo(() => {
    const data = [];
    const start = new Date(monthlyReportStartDate + 'T00:00:00');
    const end = new Date(monthlyReportEndDate + 'T23:59:59');
    
    // We can iterate day-by-day
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const day = current.getDate().toString().padStart(2, '0');
      const datePrefix = `${year}-${month}-${day}`;
      
      const dailyRevenue = filteredOrders
        .filter(o => {
          const oDate = o.paymentDate || o.createdAt;
          return oDate.startsWith(datePrefix) && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
        })
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const dailyTrxCount = filteredOrders
        .filter(o => o.createdAt.startsWith(datePrefix) && o.status !== OrderStatus.DIBATALKAN)
        .length;

      data.push({
        day: `${day}/${month}`,
        date: datePrefix,
        revenue: dailyRevenue,
        transactions: dailyTrxCount,
      });

      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [monthlyReportStartDate, monthlyReportEndDate, filteredOrders]);

  const monthlyReportStats = React.useMemo(() => {
    let totalRevenue = 0;
    let totalTransactions = 0;
    let peakRevenue = 0;
    let peakDay = '';
    let lowestRevenue = Infinity;
    let lowestDay = '';
    let activeDaysCount = 0;

    monthlyRevenueData.forEach(d => {
      totalRevenue += d.revenue;
      totalTransactions += d.transactions;
      if (d.revenue > peakRevenue) {
        peakRevenue = d.revenue;
        peakDay = d.day;
      }
      if (d.revenue > 0 && d.revenue < lowestRevenue) {
        lowestRevenue = d.revenue;
        lowestDay = d.day;
      }
      if (d.revenue > 0) {
        activeDaysCount++;
      }
    });

    if (lowestRevenue === Infinity) {
      lowestRevenue = 0;
    }

    const averageRevenue = monthlyRevenueData.length > 0 ? (totalRevenue / monthlyRevenueData.length) : 0;

    return {
      totalRevenue,
      totalTransactions,
      peakRevenue,
      peakDay,
      lowestRevenue,
      lowestDay,
      averageRevenue,
      activeDaysCount
    };
  }, [monthlyRevenueData]);

  const paymentPieData = React.useMemo(() => {
    const statsByMethod = popularPaymentMethodStats.allMethods as { [key: string]: { count: number; totalAmount: number } };
    const values = Object.values(statsByMethod) as { count: number; totalAmount: number }[];
    const totalAmountInRange = values.reduce((sum, item) => sum + item.totalAmount, 0);
    
    return ['Cash', 'QRIS', 'Transfer', 'Deposit'].map((method, idx) => {
      const dataItem = statsByMethod[method] || { count: 0, totalAmount: 0 };
      return {
        name: method,
        value: dataItem.totalAmount,
        count: dataItem.count,
        percentage: totalAmountInRange > 0 ? Math.round((dataItem.totalAmount / totalAmountInRange) * 100) : 0,
        color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'][idx]
      };
    });
  }, [popularPaymentMethodStats]);

  // Real-time calculation of employee activity metrics based on customizable date range
  const getCashierActivityBreakdown = (cashierId: string, startDateStr: string, endDateStr: string) => {
    const logs = LaughDryDatabase.getAuditLogs();
    
    // We parse the dates
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');

    // Filter logs for this cashier and within date range
    const cashierLogs = logs.filter(log => {
      if (log.userId !== cashierId) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });

    let newTransactionsCount = 0;
    let cuciCount = 0;
    let setrikaCount = 0;
    let packingCount = 0;
    let selesaiCount = 0;

    // Scan logs
    cashierLogs.forEach(log => {
      const action = log.action || '';
      const details = log.details || '';

      if (action === 'ORDER_CREATE') {
        newTransactionsCount++;
      } else if (action === 'STATUS_TRANSITION') {
        if (details.includes('ke [Dicuci]')) {
          cuciCount++;
        } else if (details.includes('ke [Disetrika/Dilipat]') || details.includes('ke [Disetrika]')) {
          setrikaCount++;
        } else if (details.includes('ke [Dikemas]') || details.includes('ke [Siap Diambil]')) {
          packingCount++;
        } else if (details.includes('ke [Selesai]')) {
          selesaiCount++;
        }
      }
    });

    // Support with actual database orders assigned to or updated by this employee within the active dates
    // to provide comprehensive and authentic statistics
    orders.forEach(o => {
      const oDate = new Date(o.createdAt);
      if (oDate >= start && oDate <= end) {
        if (o.cashierId === cashierId) {
          // Every order assigned is a new transaction
          const hasLog = cashierLogs.some(l => l.action === 'ORDER_CREATE' && l.details.includes(o.invoiceNumber));
          if (!hasLog) {
            newTransactionsCount++;
          }

          // Deduce status accomplishments that might not have a detailed persistent audit log
          const hasStatusLog = (statusKeyword: string) =>
            cashierLogs.some(l => l.action === 'STATUS_TRANSITION' && l.details.includes(o.invoiceNumber) && l.details.toLowerCase().includes(statusKeyword));

          if (o.status === OrderStatus.DICUCI && !hasStatusLog('dicuci')) {
            cuciCount++;
          } else if (o.status === OrderStatus.DISETRIKA_DILIPAT) {
            if (!hasStatusLog('dicuci')) cuciCount++;
            if (!hasStatusLog('setrika')) setrikaCount++;
          } else if (o.status === OrderStatus.DIKEMAS || o.status === OrderStatus.SIAP_DIAMBIL) {
            if (!hasStatusLog('dicuci')) cuciCount++;
            if (!hasStatusLog('setrika')) setrikaCount++;
            if (!hasStatusLog('dikemas') && !hasStatusLog('siap')) packingCount++;
          } else if (o.status === OrderStatus.SELESAI) {
            if (!hasStatusLog('dicuci')) cuciCount++;
            if (!hasStatusLog('setrika')) setrikaCount++;
            if (!hasStatusLog('dikemas') && !hasStatusLog('siap')) packingCount++;
            if (!hasStatusLog('selesai')) selesaiCount++;
          }
        }
      }
    });

    return {
      newTransactionsCount,
      cuciCount,
      setrikaCount,
      packingCount,
      selesaiCount,
      totalActivities: newTransactionsCount + cuciCount + setrikaCount + packingCount + selesaiCount,
      filteredLogs: cashierLogs
    };
  };

  // Helper for downloading a styled / formatted "Lunas Only" report summary Excel book
  const handleDownloadLunasSummaryReport = (startDate: string, endDate: string) => {
    const startLimit = startDate;
    const endLimit = endDate + 'T23:59:59';
    
    const lunasOrders = filteredOrders.filter(o => {
      const oDate = o.paymentDate || o.createdAt;
      return oDate >= startLimit && oDate <= endLimit && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
    });

    const totalOmzetLunas = lunasOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageLunas = lunasOrders.length > 0 ? (totalOmzetLunas / lunasOrders.length) : 0;

    // Branches and methods breakdown
    const branchBreakdown: Record<string, { count: number, total: number }> = {};
    const methodBreakdown: Record<string, { count: number, total: number }> = {};

    lunasOrders.forEach(o => {
      const branchName = o.branchId === 'br-1' ? 'Cabang Utama' : (o.branchId === 'br-2' ? 'Cabang Ruko' : o.branchId);
      if (!branchBreakdown[branchName]) branchBreakdown[branchName] = { count: 0, total: 0 };
      branchBreakdown[branchName].count++;
      branchBreakdown[branchName].total += o.totalAmount;

      const method = o.paymentMethod || 'Tunai';
      if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, total: 0 };
      methodBreakdown[method].count++;
      methodBreakdown[method].total += o.totalAmount;
    });

    // Build Excel Structure
    const excelRows: any[][] = [];
    excelRows.push(["LAPORAN RINGKASAN OMZET RESMI (TRANSAKSI LUNAS)"]);
    excelRows.push(["LAUGHDRY PREMIUM OUTLET"]);
    excelRows.push([]);
    excelRows.push(["Periode Analisa", `${startDate} s.d ${endDate}`]);
    excelRows.push(["Waktu Diunduh", new Date().toLocaleString('id-ID')]);
    excelRows.push(["Filter Mutlak", "HANYA STATUS LUNAS (PIUTANG DI-EKSKLUSI)"]);
    excelRows.push([]);
    excelRows.push(["1. RINGKASAN FINANSIAL"]);
    excelRows.push(["Total Omzet Lunas", `Rp ${totalOmzetLunas.toLocaleString('id-ID')}`]);
    excelRows.push(["Volume Transaksi", `${lunasOrders.length} Order Sukses`]);
    excelRows.push(["Rata-rata/Transaksi", `Rp ${Math.round(averageLunas).toLocaleString('id-ID')}`]);
    excelRows.push([]);
    
    excelRows.push(["2. DISTRIBUSI PENDAPATAN PER CABANG"]);
    excelRows.push(["Cabang", "Pendapatan", "Volume Transaksi"]);
    Object.entries(branchBreakdown).forEach(([branch, data]) => {
      excelRows.push([branch, `Rp ${data.total.toLocaleString('id-ID')}`, `${data.count} Trx`]);
    });
    if (Object.keys(branchBreakdown).length === 0) {
      excelRows.push(["Tidak ada data cabang"]);
    }
    excelRows.push([]);

    excelRows.push(["3. DISTRIBUSI METODE PEMBAYARAN"]);
    excelRows.push(["Metode", "Pendapatan", "Volume Transaksi"]);
    Object.entries(methodBreakdown).forEach(([method, data]) => {
      excelRows.push([method, `Rp ${data.total.toLocaleString('id-ID')}`, `${data.count} Trx`]);
    });
    if (Object.keys(methodBreakdown).length === 0) {
      excelRows.push(["Tidak ada data metode pembayaran"]);
    }
    excelRows.push([]);

    excelRows.push([`4. DAFTAR DETAIL TRANSAKSI LUNAS (${lunasOrders.length} BARIS)`]);
    excelRows.push(["No Nota", "Tanggal Pembayaran", "Nama Pelanggan", "Status", "Metode", "Biaya Akhir (Rp)"]);
    
    lunasOrders.forEach(o => {
      const nota = o.invoiceNumber;
      const tgl = new Date(o.paymentDate || o.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const nama = o.customerName;
      const status = o.status;
      const mthd = o.paymentMethod || 'Tunai';
      const total = `Rp ${o.totalAmount.toLocaleString('id-ID')}`;
      excelRows.push([nota, tgl, nama, status, mthd, total]);
    });
    excelRows.push([]);
    excelRows.push(["Laporan ini bersifat resmi, valid, dan bebas dari data piutang (kredit berjalan)."]);
    excelRows.push(["Dicetak otomatis oleh LaughDry Owner Dashboard."]);

    const ws = XLSX.utils.aoa_to_sheet(excelRows);
    styleWorksheet(ws);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ringkasan Lunas");
    
    XLSX.writeFile(wb, `Laporan_Omzet_Lunas_Murni_${startDate}_sd_${endDate}.xlsx`);

    LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'DOWNLOAD_LUNAS_SUMMARY', `Mengunduh laporan omzet lunas murni (.xlsx) periode ${startDate} s.d ${endDate}`);
    triggerToast(`📥 Berhasil mengunduh Laporan Omzet Lunas Murni (${lunasOrders.length} transaksi) format Excel!`);
  };

  const handleDownloadLunasPDFReport = (startDate: string, endDate: string) => {
    const startLimit = startDate;
    const endLimit = endDate + 'T23:59:59';
    
    const lunasOrders = filteredOrders.filter(o => {
      const oDate = o.paymentDate || o.createdAt;
      return oDate >= startLimit && oDate <= endLimit && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
    });

    const totalOmzetLunas = lunasOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const totalExpenses = LaughDryDatabase.getExpenses()
      .filter(ex => ex.date >= startDate && ex.date <= endDate)
      .reduce((sum, ex) => sum + ex.amount, 0);

    const netProfit = totalOmzetLunas - totalExpenses;

    const paymentMethods: Record<string, number> = { Cash: 0, QRIS: 0, Transfer: 0 };
    const paymentStatusCount: Record<string, number> = { 'LUNAS': lunasOrders.length, 'BELUM LUNAS': 0 };

    lunasOrders.forEach(o => {
      const method = o.paymentMethod || 'Cash';
      const normalizedMethod = method.toUpperCase().includes('QRIS') ? 'QRIS' : (method.toUpperCase().includes('TRANSFER') ? 'Transfer' : 'Cash');
      paymentMethods[normalizedMethod] = (paymentMethods[normalizedMethod] || 0) + o.totalAmount;
    });

    const unpaidOrders = filteredOrders.filter(o => {
      const oDate = o.createdAt;
      return oDate >= startLimit && oDate <= endLimit && o.paymentStatus !== 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
    });
    paymentStatusCount['BELUM LUNAS'] = unpaidOrders.length;

    downloadFinancialReportPDF({
      startDate,
      endDate,
      totalOmzet: totalOmzetLunas,
      totalExpenses,
      netProfit,
      completedOrdersCount: lunasOrders.length,
      paymentMethods,
      paymentStatus: paymentStatusCount
    }, getOwnerName());

    LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'DOWNLOAD_FINANCIAL_PDF', `Mengunduh laporan keuangan PDF periode ${startDate} s.d ${endDate}`);
    triggerToast(`📥 Berhasil mengunduh Laporan Laba Rugi PDF periode ${startDate} s.d ${endDate}!`);
  };

  const handleDownloadTodayPDF = () => {
    const activeTodayStr = new Date().toISOString().split('T')[0];
    const todayOrders = filteredOrders.filter(o => o.createdAt.startsWith(activeTodayStr) && o.paymentStatus === 'Lunas');
    
    const mappedOrders = todayOrders.map(o => ({
      invoiceNumber: o.invoiceNumber,
      createdAt: o.createdAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status
    }));

    downloadDailyTransactionsPDF(mappedOrders, activeTodayStr, getOwnerName());
    triggerToast("📥 Berhasil mengunduh Laporan Transaksi Harian dalam format PDF!");
  };

  // Helper for exporting monthly spreadsheet to Excel
  const handleExportMonthlyExcel = () => {
    const headers = ["No Nota", "Tanggal", "Nama Pelanggan", "Nomor HP", "Layanan Laundry", "Total Biaya (Rp)", "Metode Pembayaran", "Status Pembayaran", "Status Progres"];
    
    const rows = monthlyTransactions.map((o) => {
      const servicesStr = o.items.map(it => `${it.serviceName} (${it.quantity}x)`).join('; ');
      return [
        o.invoiceNumber,
        new Date(o.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        o.customerName,
        o.customerPhone,
        servicesStr,
        o.totalAmount,
        o.paymentMethod || 'Cash',
        o.paymentStatus,
        o.status
      ];
    });

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    styleWorksheet(ws);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi Laundry");
    
    XLSX.writeFile(wb, `Laporan_Transaksi_Laundry_${monthlyReportStartDate}_sd_${monthlyReportEndDate}.xlsx`);
    
    LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'EXPORT_EXCEL', `Mengekspor ${monthlyTransactions.length} transaksi periode ${monthlyReportStartDate} s.d ${monthlyReportEndDate} ke Excel`);
    triggerToast(`✅ Berhasil mengekspor ${monthlyTransactions.length} transaksi periode ${monthlyReportStartDate} s.d ${monthlyReportEndDate} ke Excel!`);
  };

  // Helper for physically printing monthly report
  const handlePrintMonthlyReport = () => {
    const confirmPrint = window.confirm("Konfirmasi Cetak Laporan:\\nApakah Anda ingin mengirimkan laporan transaksi bulanan ke antrean printer kasir fisik?");
    if (!confirmPrint) return;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      const rowsHtml = monthlyTransactions.map(o => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-family: monospace;">${o.invoiceNumber}</td>
          <td style="padding: 8px;">${o.customerName}</td>
          <td style="padding: 8px;">${o.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}</td>
          <td style="padding: 8px; text-align: center;">${o.paymentMethod || 'Cash'}</td>
          <td style="padding: 8px; text-align: center;">${o.paymentStatus}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">Rp ${o.totalAmount.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');

      const totalAmount = monthlyTransactions.reduce((sum, o) => sum + o.totalAmount, 0);

      doc.write(`
        <html>
          <head>
            <title>Laporan Transaksi Laundry - ${monthlyReportStartDate} s.d ${monthlyReportEndDate}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h1 { margin: 0; font-size: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 10px; font-weight: bold; }
              td { border: 1px solid #ddd; padding: 8px; }
              .total { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; }
            </style>
          </head>
          <body>
            <header>
              <h1>LAPORAN TRANSAKSI LAUNDRY (FINANCIAL LEDGER)</h1>
              <p style="margin: 5px 0 0; font-size: 12px;">Periode: ${monthlyReportStartDate} s.d ${monthlyReportEndDate} | Cabang: ${selectedBranch === 'all' ? 'Semua Cabang' : selectedBranch}</p>
            </header>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">No Nota</th>
                  <th style="text-align: left;">Pelanggan</th>
                  <th style="text-align: left;">Layanan</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th style="text-align: right;">Biaya</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <div class="total">
              TOTAL OMZET PERIODE TERPILIH: Rp ${totalAmount.toLocaleString('id-ID')}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(iframe);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
      
      LaughDryDatabase.logActivity('usr-1', getOwnerName(), 'owner', 'PRINT_REPORT', `Mencetak dokumen fisik laporan transaksi periode ${monthlyReportStartDate} s.d ${monthlyReportEndDate}`);
      triggerToast(`🖨️ Mengirim data cetak laporan transaksi periode ${monthlyReportStartDate} s.d ${monthlyReportEndDate} ke mesin printer...`);
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  return (
    <div 
      className="space-y-6" 
      id="owner-dashboard-root"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 border border-slate-800 text-sky-400 px-4 py-3 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-medium text-white">{showToast}</span>
        </div>
      )}

      {/* Control Strip */}
      <div className="flex flex-row items-center justify-between gap-1.5 bg-white p-2 rounded-xl border border-slate-150 shadow-sm">
        <div className="space-y-0.5">
          <div className="text-[9px] text-slate-500 font-medium flex items-center gap-1">
            Hak Akses: <span className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded-full font-bold text-[9px]">Owner ({getOwnerName()})</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[9px] text-red-650 hover:text-red-700 hover:underline font-extrabold bg-red-50 px-1 py-0.5 rounded transition inline-flex items-center ml-1.5 cursor-pointer"
                title="Keluar dari sesi Owner"
              >
                Keluar
              </button>
            )}
          </div>
          <h2 className="text-[10px] md:text-xs font-bold text-slate-800 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="hidden xs:inline">Dasbor Analitik Bisnis & Konsol Kontrol</span>
            <span className="xs:hidden">Analitik Bisnis</span>
          </h2>
        </div>

        {/* Filters and Utilities (Compact Mobile Layout with Icons Only) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Branch Selector */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-150 px-1 py-0.5 rounded-lg text-[10px] shrink-0">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-medium text-slate-700 border-none outline-none focus:ring-0 p-0 text-[10px] h-auto cursor-pointer"
              id="branch-selector"
            >
              <option value="all">Semua</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 border border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition shrink-0 cursor-pointer"
            id="btn-export-excel"
            title="Ekspor Excel untuk Audit"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <label
            htmlFor="excel-import-file"
            className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition cursor-pointer shrink-0"
            id="label-import-excel"
            title="Impor Excel (Restore data)"
          >
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              id="excel-import-file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* SUB-TAB CONTENTS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="space-y-6"
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >

      {/* 1. REALTIME KEY FINANCIAL PERFORMANCES ACCORDION */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn" id="section-analytics">
          {/* Inner Tab Selector */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">📊</span>
              <span className="font-extrabold text-[#0D1B2A] text-xs uppercase tracking-wider font-sans">Menu Analisis Laundry</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-150">
              <button
                type="button"
                onClick={() => setAnalyticsInnerTab('financial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  analyticsInnerTab === 'financial'
                    ? 'bg-[#0D1B2A] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Ringkasan Finansial
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsInnerTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  analyticsInnerTab === 'monthly'
                    ? 'bg-[#0D1B2A] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Laporan Bulanan
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsInnerTab('productivity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  analyticsInnerTab === 'productivity'
                    ? 'bg-[#0D1B2A] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Produktivitas Karyawan
              </button>
            </div>
          </div>

          {/* TAB 1: RINGKASAN FINANSIAL */}
          {analyticsInnerTab === 'financial' && (
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fadeIn">
              <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📈</span>
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Ringkasan Finansial</span>
                </div>
              </div>
              <div className="p-4 space-y-6">
          {/* Multi Grid KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* KPI 1 */}
            <div
              onClick={() => setShowTodayTransactionsModal(true)}
              className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              title="Klik untuk melihat detail transaksi hari ini"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-500 uppercase group-hover:text-emerald-600 transition-colors">Omzet Hari Ini</span>
                <span className="p-0.5 px-1.5 rounded-full bg-emerald-50 text-[8.5px] sm:text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2.5">
                <div className="text-sm sm:text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">Rp {omzetHariIni.toLocaleString('id-ID')}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[8.5px] sm:text-[10px] text-indigo-600 font-mono">{orderHariIniCount} Order</span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Detail ➔</span>
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div 
              onClick={() => setShowAccumulatedOmzetModal(true)}
              className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              title="Klik untuk melihat detail omzet lunas terakumulasi"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-550 uppercase group-hover:text-violet-600 transition-colors">Omzet Akumulasi</span>
                <span className="p-1 bg-violet-50 text-violet-700 rounded-full">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2.5">
                <div className="text-sm sm:text-lg font-extrabold text-slate-800 group-hover:text-violet-700 transition-colors">Rp {totalOmzet.toLocaleString('id-ID')}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[8.5px] sm:text-[10px] text-slate-400">Terakumulasi</span>
                  <span className="text-[8px] sm:text-[9px] text-violet-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Detail ➔</span>
                </div>
              </div>
            </div>

            {/* KPI 3 (New): Piutang */}
            <div 
              onClick={() => setShowPiutangModal(true)}
              className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              title="Klik untuk melihat rincian piutang pelanggan yang belum lunas"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-550 uppercase group-hover:text-rose-600 transition-colors">Piutang Pelanggan</span>
                <span className="p-0.5 px-1.5 rounded-full bg-rose-50 text-[8.5px] sm:text-[10px] text-rose-700 font-bold">
                  ⚠️ Belum Lunas
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2.5">
                <div className="text-sm sm:text-lg font-extrabold text-rose-600">Rp {totalPiutang.toLocaleString('id-ID')}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[8.5px] sm:text-[10px] text-slate-400">Hari ini: Rp {piutangHariIni.toLocaleString('id-ID')}</span>
                  <span className="text-[8px] sm:text-[9px] text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Detail ➔</span>
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div 
              onClick={() => setShowOPEXModal(true)}
              className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-red-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              title="Klik untuk melihat pengeluaran operasional cabang"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-550 uppercase group-hover:text-red-600 transition-colors">Total OPEX</span>
                <span className="p-1 bg-red-50 text-red-700 rounded-full">
                  <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2.5">
                <div className="text-sm sm:text-lg font-extrabold text-red-600">Rp {totalOPEX.toLocaleString('id-ID')}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[8.5px] sm:text-[10px] text-slate-400">Sewa, Gaji, Operasional</span>
                  <span className="text-[8px] sm:text-[9px] text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Detail ➔</span>
                </div>
              </div>
            </div>

            {/* KPI 5 */}
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-500 uppercase">Estimasi Laba</span>
                <span className={`p-0.5 px-1.5 rounded-full text-[8.5px] sm:text-[10px] font-bold ${labaBersih >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {labaBersih >= 0 ? 'Surplus' : 'Defisit'}
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2.5">
                <div className={`text-sm sm:text-lg font-extrabold ${labaBersih >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  Rp {labaBersih.toLocaleString('id-ID')}
                </div>
                <div className="text-[8.5px] sm:text-[10px] text-slate-400 mt-0.5">Omzet dikurang total OPEX</div>
              </div>
            </div>
          </div>

          {/* Quick Info Grid Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl">
              <div className="text-[8.5px] sm:text-[10px] text-slate-400 font-semibold uppercase">Order Aktif Diproses</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">{activeOrdersCount} Order</div>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl">
              <div className="text-[8.5px] sm:text-[10px] text-slate-400 font-semibold uppercase">Order Selesai</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">{completedOrdersCount} Order</div>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl">
              <div className="text-[8.5px] sm:text-[10px] text-slate-400 font-semibold uppercase">Rasio Retensi CRM</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">{Math.round((activeCustomersCount / (customers.length || 1)) * 105)}%</div>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl">
              <div className="text-[8.5px] sm:text-[10px] text-slate-400 font-semibold uppercase">Rata-rata Pendapatan / Order</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Rp {Math.round(totalOmzet / (filteredOrders.length || 1)).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Graphical Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Revenue Trend 28-30 May */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-sm text-slate-800 mb-3 block">Grafik Omzet & Margin Usaha Hari Berjalan (Mei 2026)</h4>
              <div className="h-48 flex items-end justify-between gap-4 border-b border-slate-100 pb-2 relative font-sans">
                {/* Horizontal Guide Lines */}
                <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100/60 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100/60 pointer-events-none"></div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100/60 pointer-events-none"></div>

                {/* Day 28 */}
                <div className="flex-1 flex flex-col items-center group relative cursor-pointer">
                  <div className="text-[10px] font-bold text-slate-900 mb-1 group-hover:block opacity-80">Rp {o28.toLocaleString()}</div>
                  <div className="w-full bg-slate-200 group-hover:bg-sky-500 rounded-t-lg transition-all" style={{ height: '70px' }}></div>
                  <span className="text-[10px] text-slate-500 mt-1 font-semibold">28 Mei (Real)</span>
                </div>

                {/* Day 29 */}
                <div className="flex-1 flex flex-col items-center group relative cursor-pointer">
                  <div className="text-[10px] font-bold text-slate-900 mb-1 group-hover:block opacity-80">Rp {o29.toLocaleString()}</div>
                  <div className="w-full bg-slate-200 group-hover:bg-sky-500 rounded-t-lg transition-all" style={{ height: '95px' }}></div>
                  <span className="text-[10px] text-slate-500 mt-1 font-semibold">29 Mei (Real)</span>
                </div>

                {/* Day 30 */}
                <div className="flex-1 flex flex-col items-center group relative cursor-pointer text-indigo-700">
                  <div className="text-[10px] font-bold text-indigo-700 mb-1">Rp {o30.toLocaleString()}</div>
                  <div className="w-full bg-indigo-500 rounded-t-lg shadow-sm" style={{ height: '115px' }}></div>
                  <span className="text-[10px] text-indigo-700 font-bold mt-1">30 Mei (Hari Ini)</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-200 rounded"></span> Omzet Reguler</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded"></span> Hari Terkini (Sabtu)</div>
              </div>
            </div>

            {/* Chart 2: Expense Proportions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-sm text-slate-800 mb-3 block">Bauran Pengeluaran Operasional (OPEX Breakdown)</h4>
              <div className="space-y-3.5 pt-1 text-xs">
                {/* Salary */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Gaji & Kesejahteraan Karyawan</span>
                    <span>Rp {expenses.filter(e => e.category === 'Gaji').reduce((s, e) => s + e.amount, 0).toLocaleString()} ({(Math.round((expenses.filter(e => e.category === 'Gaji').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100)) || 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${(expenses.filter(e => e.category === 'Gaji').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Utilities (Listrik + Air) */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Utilitas Listrik, Gas & Air</span>
                    <span>Rp {expenses.filter(e => e.category === 'Listrik' || e.category === 'Air').reduce((s, e) => s + e.amount, 0).toLocaleString()} ({(Math.round((expenses.filter(e => e.category === 'Listrik' || e.category === 'Air').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100)) || 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(expenses.filter(e => e.category === 'Listrik' || e.category === 'Air').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Detergents */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Detergen, Softener & Perlengkapan Harian</span>
                    <span>Rp {expenses.filter(e => e.category === 'Detergen/Softener' || e.category === 'Perlengkapan').reduce((s, e) => s + e.amount, 0).toLocaleString()} ({(Math.round((expenses.filter(e => e.category === 'Detergen/Softener' || e.category === 'Perlengkapan').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100)) || 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(expenses.filter(e => e.category === 'Detergen/Softener' || e.category === 'Perlengkapan').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Maintenance / Transport */}
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Pemeliharaan Mesin & BBM Transport</span>
                    <span>Rp {expenses.filter(e => e.category === 'Maintenance' || e.category === 'Transportasi').reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(expenses.filter(e => e.category === 'Maintenance' || e.category === 'Transportasi').reduce((s, e) => s + e.amount, 0) / (totalOPEX || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* METODE PEMBAYARAN TERPOPULER GRAPHICAL ANALYTICS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <h4 className="font-extrabold text-[#0D1B2A] text-xs uppercase tracking-wide flex items-center gap-1.5 font-sans">
                      <span>💳</span> Metode Pembayaran Terpopuler
                    </h4>
                    <p className="text-[10.5px] text-slate-500 font-semibold font-sans mt-0.5 font-sans">Analisis persentase penggunaan saluran penerimaan lunas laundry.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Dari:</span>
                      <input
                        type="date"
                        value={paymentStartDate}
                        onChange={(e) => setPaymentStartDate(e.target.value)}
                        className="bg-white border border-slate-205 rounded-lg px-2 py-0.5 text-[10px] font-black text-slate-700 outline-none cursor-pointer animate-fadeIn"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">S/D:</span>
                      <input
                        type="date"
                        value={paymentEndDate}
                        onChange={(e) => setPaymentEndDate(e.target.value)}
                        className="bg-white border border-slate-205 rounded-lg px-2 py-0.5 text-[10px] font-black text-slate-700 outline-none cursor-pointer animate-fadeIn"
                      />
                    </div>
                  </div>
                </div>

                {popularPaymentMethodStats.totalCount > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-5 h-48 w-full relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            paddingAngle={3}
                          >
                            {paymentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`Rp ${value.toLocaleString()}`, "Nominal"]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center mt-[-4px]">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none">Lunas Trx</span>
                        <strong className="text-sm font-black text-[#0D1B2A] font-mono leading-none">{popularPaymentMethodStats.totalCount}</strong>
                      </div>
                    </div>
                    <div className="lg:col-span-7 space-y-3.5 text-xs font-sans">
                      <div className="text-[9.5px] font-black uppercase text-slate-450 tracking-wider">Metode Penerimaan Terakumulasi:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {paymentPieData.map((item) => (
                          <div key={item.name} className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 rounded-full shrink-0 h-2" style={{ backgroundColor: item.color }}></span>
                              <span className="font-extrabold text-slate-800">{item.name}</span>
                              <span className="text-[9.5px] font-bold text-slate-400 ml-auto">{item.percentage}%</span>
                            </div>
                            <div className="font-mono font-black text-slate-850 text-xs">Rp {item.value.toLocaleString()}</div>
                            <div className="text-[9.0px] text-slate-400 font-semibold flex justify-between">
                              <span>Volume:</span>
                              <strong className="text-slate-700">{item.count} Trx</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-2xl text-[10.5px] font-extrabold text-indigo-900 flex justify-between font-mono">
                        <span>Sistem Terpopuler: {popularPaymentMethodStats.bestMethod}</span>
                        <span>Total Filter Terbayar: {popularPaymentMethodStats.totalCount} Order</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada transaksi dengan status "Lunas" dalam rentang tanggal terpilih.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* TAB 2: LAPORAN BULANAN (MONTHLY LEDGER SUMMARY) */}
          {analyticsInnerTab === 'monthly' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 px-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs leading-none">
                      📈
                    </span>
                    Laporan Ringkasan Bulanan (Financial Monthly Summary)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pantau ringkasan arus kas, rata-rata pendapatan harian, dan visualisasi performa omzet harian Anda.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-sans">Pilih Periode:</span>
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-3 rounded-full border border-slate-150">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider">DARI:</span>
                      <input
                        type="date"
                        value={monthlyReportStartDate}
                        onChange={(e) => setMonthlyReportStartDate(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-0"
                      />
                    </div>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider">S/D:</span>
                      <input
                        type="date"
                        value={monthlyReportEndDate}
                        onChange={(e) => setMonthlyReportEndDate(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive KPI Widgets Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                {/* Stat 1 */}
                <div
                  onClick={() => setShowMonthlyRevenueDetail(true)}
                  className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl border border-emerald-400 space-y-1 cursor-pointer transition-all hover:shadow-md active:scale-98 relative group select-none"
                  title="Klik untuk membuka dialog log transaksi pada bulan berjalan"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase text-emerald-100 tracking-wider block">Total Omzet Bulan Ini</span>
                    <span className="text-[8.5px] bg-emerald-700 px-1.5 py-0.5 rounded-md font-extrabold uppercase animate-pulse">Buka Log ➔</span>
                  </div>
                  <div className="text-base font-extrabold font-mono">
                    Rp {monthlyReportStats.totalRevenue.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[9.5px] text-emerald-100/90 font-medium font-sans">Klik disini untuk cetak fisik / ekspor file Excel profesional.</p>
                </div>

              {/* Stat 2 */}
              <div className="p-4 bg-sky-50/40 border border-sky-100/80 rounded-2xl space-y-1">
                <span className="text-[9.5px] font-black uppercase text-sky-700 tracking-wider block">Rata-Rata Omzet Harian</span>
                <div className="text-base font-extrabold text-slate-900 font-sans">
                  Rp {Math.round(monthlyReportStats.averageRevenue).toLocaleString('id-ID')}
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium font-sans">Rata-rata pendapatan harian bersih.</p>
              </div>

              {/* Stat 3 */}
              <div className="p-4 bg-violet-50/40 border border-violet-100/80 rounded-2xl space-y-1">
                <span className="text-[9.5px] font-black uppercase text-violet-700 tracking-wider block">Volume Transaksi</span>
                <div className="text-base font-extrabold text-slate-900 font-sans">
                  {monthlyReportStats.totalTransactions} Order
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium">Banyaknya pemesanan laundry terdaftar.</p>
              </div>

              {/* Stat 4 */}
              <div className="p-4 bg-amber-50/40 border border-amber-100/80 rounded-2xl space-y-1">
                <span className="text-[9.5px] font-black uppercase text-amber-800 tracking-wider block">Omzet Puncak (Peak Day)</span>
                <div className="text-base font-extrabold text-emerald-800 font-sans font-mono text-[11px] truncate" title={monthlyReportStats.peakRevenue > 0 ? `Hari ${monthlyReportStats.peakDay} (Rp ${monthlyReportStats.peakRevenue.toLocaleString('id-ID')})` : 'N/A'}>
                  {monthlyReportStats.peakRevenue > 0 ? `Hari ${monthlyReportStats.peakDay}: Rp ${monthlyReportStats.peakRevenue.toLocaleString('id-ID')}` : 'N/A'}
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium">Hari dengan capaian pendapatan lunas tertinggi.</p>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-slate-50/40 border border-slate-150 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 font-sans uppercase tracking-wider">Diagram Pendapatan Harian Kumulatif</h4>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-sans">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-sky-500 rounded-sm"></span> Omzet Lunas (Harian)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Hari Omzet Puncak
                  </span>
                </div>
              </div>
              <div className="h-64 w-full text-[10.5px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyRevenueData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="day" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        return [`Rp ${value.toLocaleString('id-ID')}`, "Pendapatan Lunas"];
                      }}
                      labelFormatter={(label) => `Tanggal ${label}`}
                      contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'none' }}
                    />
                    <Bar dataKey="revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={22}>
                      {monthlyRevenueData.map((entry, index) => {
                        const isPeak = entry.revenue === monthlyReportStats.peakRevenue && entry.revenue > 0;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isPeak ? '#10B981' : '#0EA5E9'} 
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center leading-relaxed">
                💡 <span className="font-bold">Tips Analitik:</span> Batang berwarna <span className="font-bold text-emerald-500">Hijau</span> menandakan hari dengan omzet puncak yang diraih sepanjang bulan.
              </div>
            </div>
          </div>
        )}

          {/* TAB 3: PRODUKTIVITAS KARYAWAN & STAFF PERFORMANCE */}
          {analyticsInnerTab === 'productivity' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    Dasbor Produktivitas Staf & Kasir (Real-Time)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mengetuk profil kasir akan menampilkan ringkasan aktivitas operasional terperinci (proses input, setrika, siap ambil).</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-3 rounded-full border border-slate-150">
                  <span className="text-[10px] font-bold text-slate-500 font-sans">Total Kasir Aktif:</span>
                  <span className="text-[10.5px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-sans">
                    {cashierMetricsData.length} Staff
                  </span>
                </div>
              </div>

              {/* Cashier Scoreboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cashierMetricsData.map((cashier) => (
                  <div
                    key={cashier.id}
                    onClick={() => setSelectedActiveCashier(cashier)}
                    className="p-4 bg-slate-50/50 border border-slate-150 hover:border-indigo-400 hover:bg-sky-50/15 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200 active:scale-98 select-none group"
                    title="Ketuk profil untuk melihat ringkasan aktivitas operasional detail"
                  >
                    <img src={cashier.avatar} alt={cashier.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-indigo-50 group-hover:scale-105 transition" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-extrabold text-[#0D1B2A] truncate group-hover:text-indigo-805 transition">{cashier.name}</h4>
                        <span className="text-[9px] font-semibold text-slate-400 bg-white border border-slate-201 px-1.5 py-0.2 rounded uppercase">@{cashier.username}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-500 text-[10.5px] pt-1">
                        <div className="bg-white p-1.5 rounded-xl border border-slate-100">
                          <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Omzet Buku</span>
                          <strong className="text-slate-800 font-extrabold font-mono">Rp {cashier.totalRevenue.toLocaleString()}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-xl border border-slate-100">
                          <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Qty Transaksi</span>
                          <strong className="text-slate-800 font-extrabold font-mono">{cashier.transactionCount} Order</strong>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-sky-600 block mt-1">Detail Aktivitas Operasional ➔</span>
                    </div>
                  </div>
                ))}
              </div>

            {/* Recharts Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Chart 1: Revenue by Cashier */}
              <div className="p-4 bg-slate-50/30 border border-slate-150 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-755 font-sans uppercase tracking-wider">Perbandingan Pendapatan Bersih per Kasir</h4>
                  <span className="text-[9px] text-[#0ea5e9] bg-sky-50 px-2 py-0.5 rounded-full font-bold uppercase">Bar Chart</span>
                </div>
                <div className="h-60 w-full text-[10.5px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cashierMetricsData}
                      margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10.5} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10.5} tickFormatter={(value) => `Rp ${value >= 1000000 ? (value / 1000000).toFixed(1) + 'jt' : value.toLocaleString()}`} />
                      <Tooltip
                        formatter={(value: any) => [`Rp ${value.toLocaleString()}`, "Total Omzet"]}
                        contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'none' }}
                      />
                      <Bar dataKey="totalRevenue" fill="#38BDF8" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {cashierMetricsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#0EA5E9'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Transaction Count Shares */}
              <div className="p-4 bg-slate-50/30 border border-slate-150 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-755 font-sans uppercase tracking-wider">Distribusi Volume Transaksi Kasir</h4>
                  <span className="text-[9px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold uppercase">Pie Chart</span>
                </div>
                
                {cashierMetricsData.some(c => c.transactionCount > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="h-60 md:col-span-7 w-full text-[10.5px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cashierMetricsData}
                            dataKey="transactionCount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                            label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {cashierMetricsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#0EA5E9'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`${value} Order`, "Volume Transaksi"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="md:col-span-5 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Index Kontribusi:</div>
                      {cashierMetricsData.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-2 text-[10.5px]">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: index % 2 === 0 ? '#4F46E5' : '#0EA5E9' }}></span>
                          <span className="text-slate-650 truncate font-semibold">{entry.name}</span>
                          <span className="font-bold text-slate-800 ml-auto font-mono">({entry.transactionCount} trx)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-60 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                    <span>Belum ada transaksi produktif yang diproses</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* 3. KELOLA LAYANAN & TARIF ACCORDION */}
      {activeSubTab === 'services' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4" id="section-services">
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚙️</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                {servicesInnerTab === 'rates' ? 'Kelola Katalog Layanan & Tarif' : 'Kelola Parfum Aromaterapi'}
              </span>
            </div>

            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-250 self-start sm:self-auto gap-0.5 font-sans">
              <button
                type="button"
                onClick={() => setServicesInnerTab('rates')}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                  servicesInnerTab === 'rates'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚙️ Kelola Tarif Layanan
              </button>
              <button
                type="button"
                onClick={() => setServicesInnerTab('perfumes')}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                  servicesInnerTab === 'perfumes'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🌸 Kelola Parfum
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-6 animate-fadeIn" id="services-settings-panel">
            {servicesInnerTab === 'rates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-sans">Katalog Layanan & Unit Tarif Pengukuran</h3>
                <button
                  onClick={() => {
                    setEditingServiceId(null);
                    setServiceForm({ 
                      name: '', 
                      category: ratesTab, 
                      price: 0, 
                      unit: ratesTab === 'kiloan' ? 'kg' : 'pcs', 
                      estimateHours: 48, 
                      workflowSteps: ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'],
                      promiseName: 'Reguler',
                      promiseDurationVal: 2,
                      promiseDurationUnit: 'Hari'
                    });
                    setShowAddService(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  id="btn-add-service"
                >
                  <Plus className="w-4 h-4" /> Tambah Layanan Baru
                </button>
              </div>

              {/* Tab Selector untuk Kiloan vs Satuan */}
              <div className="flex border-b border-slate-200 pb-0.5" id="rates-category-tabs">
                <button
                  type="button"
                  onClick={() => setRatesTab('kiloan')}
                  className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-[2px] ${
                    ratesTab === 'kiloan'
                      ? 'border-emerald-600 text-emerald-800 font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                  id="tab-rates-kiloan"
                >
                  🧺 Layanan Kiloan
                </button>
                <button
                  type="button"
                  onClick={() => setRatesTab('satuan')}
                  className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-[2px] ${
                    ratesTab === 'satuan'
                      ? 'border-emerald-600 text-emerald-800 font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                  id="tab-rates-satuan"
                >
                  🧥 Layanan Satuan
                </button>
              </div>

          {/* Form Add Service */}
          {showAddService && (
            <form onSubmit={handleSaveService} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 max-w-xl animate-scaleIn">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {editingServiceId ? 'Edit Layanan Laundry' : 'Input Layanan Laundry Baru'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold block">Nama Layanan:</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Contoh: Bed Cover Large (Satuan)"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none"
                    id="service-name-input"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold block">Kategori Model:</label>
                  <button
                    type="button"
                    onClick={() => setActivePopupField('category')}
                    className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-2.5 text-left focus:outline-none transition cursor-pointer flex justify-between items-center text-xs text-slate-800 font-bold"
                    id="service-category-input-btn"
                  >
                    <span>{serviceForm.category === 'kiloan' ? '🧺 Laundry Kiloan (Berat kg)' : '🧥 Laundry Satuan (Per Biji)'}</span>
                    <span className="text-slate-400 text-[10px]">▼ Ubah</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold block">Harga Layanan (IDR/Unit):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                    placeholder="8000"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none text-xs"
                    id="service-price-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold block">Unit Pengukuran:</label>
                  <button
                    type="button"
                    onClick={() => setActivePopupField('unit')}
                    className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-2.5 text-left focus:outline-none transition cursor-pointer flex justify-between items-center text-xs text-slate-800 font-bold"
                    id="service-unit-input-btn"
                  >
                    <span>📦 Per {serviceForm.unit || 'kg'} ({serviceForm.category === 'kiloan' ? 'Kiloan' : 'Satuan'})</span>
                    <span className="text-slate-400 text-[10px]">▼ Ubah</span>
                  </button>
                </div>

                {serviceForm.category === 'satuan' ? (
                  <div className="space-y-1 md:col-span-2 bg-amber-50/55 p-3.5 rounded-2xl border border-amber-200/50">
                    <label className="text-amber-800 font-bold block text-xs">Ukuran / Klasifikasi Satuan:</label>
                    <p className="text-[10px] text-slate-400 mb-1.5">Klasifikasikan ukuran satuan ini (bukan estimasi waktu penyelesaian):</p>
                    <button
                      type="button"
                      onClick={() => setActivePopupField('sizeOption')}
                      className="w-full bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-2.5 text-left focus:outline-none transition cursor-pointer flex justify-between items-center text-xs text-slate-800 font-bold"
                      id="service-size-option-input-btn"
                    >
                      <span>📏 Ukuran {serviceForm.sizeOption || 'Sedang'}</span>
                      <span className="text-slate-400 text-[10px]">▼ Ubah</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold block">Nama Janji Penyelesaian:</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.promiseName}
                        onChange={(e) => setServiceForm({ ...serviceForm, promiseName: e.target.value })}
                        placeholder="Contoh: Reguler, Cepat, Express"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none text-xs"
                        id="service-promise-name-input"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold block">Waktu Penyelesaian:</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={serviceForm.promiseDurationVal}
                          onChange={(e) => setServiceForm({ ...serviceForm, promiseDurationVal: Number(e.target.value) })}
                          placeholder="Contoh: 4"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-emerald-600 focus:outline-none text-xs flex-1"
                          id="service-promise-val-input"
                        />
                        <button
                          type="button"
                          onClick={() => setActivePopupField('promiseDurationUnit')}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 font-bold text-xs shrink-0 text-slate-800 transition cursor-pointer flex items-center gap-1.5"
                          id="service-promise-unit-input-btn"
                        >
                          <span>⏱️ {serviceForm.promiseDurationUnit}</span>
                          <span className="text-[9px] text-slate-400">▼</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2 bg-[#F8FAFC] border border-slate-150 p-4 rounded-2xl">
                  <label className="text-[#0F172A] font-bold block text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Workflow & Tahapan Kerja Operasional Layanan
                  </label>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Pilih tahapan kerja yang akan dilalui cucian untuk layanan ini. Anda bisa melewati beberapa proses (misal: "Setrika Saja" tidak perlu tahapan "Dicuci").
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'].map((step) => {
                      const isSelected = serviceForm.workflowSteps.includes(step);
                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => {
                            let updatedSteps = [...serviceForm.workflowSteps];
                            if (updatedSteps.includes(step)) {
                              if (updatedSteps.length > 2) {
                                updatedSteps = updatedSteps.filter(s => s !== step);
                              }
                            } else {
                              updatedSteps.push(step);
                              const standardOrder = ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai'];
                              updatedSteps.sort((a,b) => standardOrder.indexOf(a) - standardOrder.indexOf(b));
                            }
                            setServiceForm({ ...serviceForm, workflowSteps: updatedSteps });
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span>{step}</span>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 border border-slate-200 text-transparent'
                          }`}>✓</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="text-[10px] text-emerald-700/80 font-mono mt-1 w-full bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                    Alur pengerjaan terpilih: <span className="font-extrabold text-[10.5px]">{serviceForm.workflowSteps.join(' ➔ ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-semibold transition"
                  id="btn-cancel-service"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-sm"
                  id="btn-submit-service"
                >
                  Simpan Layanan
                </button>
              </div>
            </form>
          )}

          {/* Grid Catalog Services (Grouped by Service Name) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(groupedServices)
              .filter((serviceName) => {
                const groupItems = groupedServices[serviceName];
                const representative = groupItems[0];
                return representative && representative.category === ratesTab;
              })
              .map((serviceName) => {
                const groupItems = groupedServices[serviceName];
                const representative = groupItems[0];
              
              return (
                <div 
                  key={serviceName} 
                  onClick={() => setViewingServiceGroupName(serviceName)}
                  className="bg-white rounded-3xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm cursor-pointer hover:scale-[1.01]"
                >
                  {/* Service Group Header */}
                  <div className="p-5 select-none space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider ${representative.category === 'kiloan' ? 'bg-cyan-50 text-cyan-700' : 'bg-pink-50 text-pink-700'}`}>
                        {representative.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-extrabold font-sans uppercase flex items-center gap-1">
                        📦 {groupItems.length} Variasi Jasa
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center justify-between gap-2 pr-1">
                        <span>{serviceName}</span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          ℹ️
                        </span>
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        Unit: <span className="font-bold text-slate-800">/ {representative.unit}</span> • Klik untuk rincian detail tarif.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Service Detail Pop up Modal */}
          {viewingServiceGroupName && (() => {
            const groupItems = groupedServices[viewingServiceGroupName];
            if (!groupItems || groupItems.length === 0) return null;
            const representative = groupItems[0];
            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 font-sans text-xs">
                <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-sm sm:max-w-md w-full overflow-hidden animate-scaleIn">
                  {/* Header */}
                  <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                    <div>
                      <span className={`px-1.5 py-0.5 rounded-full font-extrabold text-[8.5px] uppercase tracking-wider ${representative.category === 'kiloan' ? 'bg-cyan-50 text-cyan-700' : 'bg-pink-50 text-pink-700'}`}>
                        {representative.category}
                      </span>
                      <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm mt-0.5">
                        Detail Jasa: {viewingServiceGroupName}
                      </h4>
                    </div>
                    <button
                      onClick={() => setViewingServiceGroupName(null)}
                      className="text-slate-400 hover:text-slate-650 font-black text-xs cursor-pointer bg-slate-100 hover:bg-slate-200 h-6 w-6 rounded-full flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-3 sm:p-4 max-h-[50vh] overflow-y-auto space-y-3">
                    <h5 className="text-[8.5px] sm:text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                      Rincian {representative.category === 'kiloan' ? 'Janji Selesai' : 'Ukuran Satuan'}:
                    </h5>
                    <div className="space-y-2.5">
                      {groupItems.map(s => (
                        <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-150/80 shadow-2xs space-y-2 flex flex-col justify-between hover:border-sky-320 transition-colors">
                          <div className="flex items-start justify-between gap-2 text-[11px]">
                            <div className="space-y-0.5">
                              <span className="px-1.5 py-0.5 rounded-md font-bold text-[8.5px] sm:text-[9px] uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                {s.promiseName || (s.category === 'kiloan' ? 'Reguler' : 'Sedang')}
                              </span>
                              {s.category === 'kiloan' && (
                                <span className="text-[10px] text-slate-505 font-medium flex items-center gap-1 mt-0.5">
                                  ⏱️ {s.promiseDurationText || `${s.estimateHours} jam`}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">
                                Rp {s.price.toLocaleString('id-ID')}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">per {s.unit}</span>
                            </div>
                          </div>

                          {/* Display Workflow Steps */}
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[8.5px] leading-relaxed">
                            <span className="text-slate-400 font-extrabold block uppercase tracking-wider text-[7px] mb-0.5">Alur Kerja (Workflow)</span>
                            <p className="text-emerald-700 font-mono font-bold truncate">
                              {(s.workflowSteps || ['Antri', 'Dicuci', 'Disetrika/Dilipat', 'Dikemas', 'Siap Diambil', 'Selesai']).join(' ➔ ')}
                            </p>
                          </div>

                          {/* Actions bar for detail */}
                          <div className="flex justify-end gap-1 border-t border-slate-50 pt-1.5 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditService(s);
                                setViewingServiceGroupName(null);
                              }}
                              className="p-1 px-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-md transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Edit Detail Layanan"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmService(s);
                                setViewingServiceGroupName(null);
                              }}
                              className="p-1 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Hapus Detail Layanan"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-150 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingServiceGroupName(null)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition text-[11px] cursor-pointer shadow-2xs"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
            </div>
            )}

            {/* 🌸 CRUD PORTION FOR PARFUMS */}
            {servicesInnerTab === 'perfumes' && (
              <div className="space-y-6 animate-scaleIn font-sans text-xs">
                {/* Header title & add button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-sans">Kelola Katalog Aromaterapi Parfum</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Daftar wewangian parfum premium yang dapat dipilih pelanggan saat transaksi.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPerfumeId(null);
                      setPerfumeForm({ name: '', description: '', isActive: true, icon: '🌸' });
                      setShowAddPerfume(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" /> Tambah Parfum Baru
                  </button>
                </div>

                {/* Form Add / Edit Parfum */}
                {showAddPerfume && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!perfumeForm.name.trim()) return;
                      const existing = [...perfumes];
                      if (editingPerfumeId) {
                        const updated = existing.map(p => p.id === editingPerfumeId ? { ...p, name: perfumeForm.name, description: perfumeForm.description, isActive: perfumeForm.isActive, icon: perfumeForm.icon || '🌸' } : p);
                        setPerfumes(updated);
                        LaughDryDatabase.savePerfumes(updated);
                        triggerToast("💾 Aroma parfum berhasil diperbarui!");
                      } else {
                        const newPerfume = {
                          id: `perfume_${Date.now()}`,
                          name: perfumeForm.name,
                          description: perfumeForm.description || '-',
                          isActive: perfumeForm.isActive,
                          icon: perfumeForm.icon || '🌸'
                        };
                        const updated = [...existing, newPerfume];
                        setPerfumes(updated);
                        LaughDryDatabase.savePerfumes(updated);
                        triggerToast("💾 Aroma parfum baru berhasil ditambahkan!");
                      }
                      setShowAddPerfume(false);
                      setEditingPerfumeId(null);
                      setPerfumeForm({ name: '', description: '', isActive: true, icon: '🌸' });
                    }} 
                    className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 max-w-lg animate-scaleIn text-xs"
                  >
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      {editingPerfumeId ? '📝 Edit Detail Aroma' : '🌸 Tambah Aroma Baru'}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-slate-600 block font-semibold mb-1">Nama Aroma / Varian:</label>
                        <input
                          type="text"
                          required
                          value={perfumeForm.name}
                          onChange={(e) => setPerfumeForm({ ...perfumeForm, name: e.target.value })}
                          placeholder="Contoh: Lavender Premium, Sakura Fresh, Baby Powder"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 block font-semibold mb-1">Deskripsi Aroma (Opsional):</label>
                        <input
                          type="text"
                          value={perfumeForm.description}
                          onChange={(e) => setPerfumeForm({ ...perfumeForm, description: e.target.value })}
                          placeholder="Aroma manis menenangkan, cocok untuk setrika uap"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 block font-semibold mb-1">Pilih Ikon Unik & Lucu:</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-150 rounded-xl">
                          {['🌸', '🥥', '🍓', '🪵', '🍋', '🍏', '🍦', '🍵', '🪻', '🍯', '🍫', '💨', '🎋', '🧼', '🌊'].map((iconEmoji) => (
                            <button
                              type="button"
                              key={iconEmoji}
                              onClick={() => setPerfumeForm({ ...perfumeForm, icon: iconEmoji })}
                              className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                                perfumeForm.icon === iconEmoji
                                  ? 'bg-emerald-50 border-emerald-500 scale-110 shadow-xs font-black'
                                  : 'bg-slate-50 border-slate-150 hover:bg-slate-100 hover:border-slate-250'
                              }`}
                            >
                              {iconEmoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 font-semibold">
                        <input
                          type="checkbox"
                          id="perfume-status-checkbox"
                          checked={perfumeForm.isActive}
                          onChange={(e) => setPerfumeForm({ ...perfumeForm, isActive: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="perfume-status-checkbox" className="text-slate-700 cursor-pointer select-none">
                          Aroma Aktif & Tersedia (Bisa dipilih kasir)
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPerfume(false);
                          setEditingPerfumeId(null);
                          setPerfumeForm({ name: '', description: '', isActive: true, icon: '🌸' });
                        }}
                        className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-sm animate-pulse"
                      >
                        {editingPerfumeId ? 'Perbarui' : 'Simpan'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Table / List of Perfumes */}
                <div className="bg-white rounded-xl border border-slate-150 overflow-hidden shadow-sm animate-scaleIn">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse font-sans min-w-[280px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-150 uppercase tracking-wider text-[10px]">
                          <th className="p-3">Nama Varian Aroma</th>
                          <th className="p-3 hidden md:table-cell">Deskripsi / Catatan</th>
                          <th className="p-2 text-center hidden sm:table-cell">Status</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {perfumes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                              Belum ada katalog parfum aromaterapi. Klik Tambah Parfum Baru di atas.
                            </td>
                          </tr>
                        ) : (
                          perfumes.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 max-w-[150px] sm:max-w-none break-words">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-extrabold text-slate-800 text-xs flex flex-wrap items-center gap-1.5">
                                    <span>{p.icon || '🌸'} {p.name}</span>
                                    {/* Mobile/Compact Badge for Status */}
                                    <span className={`inline-flex sm:hidden px-1.5 py-0.2 select-none rounded text-[8px] font-bold uppercase ${
                                      p.isActive 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/70'
                                        : 'bg-rose-50 text-rose-600 border border-rose-100/70'
                                    }`}>
                                      {p.isActive ? 'Tersedia' : 'Nonaktif'}
                                    </span>
                                  </span>
                                  {/* Mobile-only subtle description display to save vertical and horizontal grid volume */}
                                  {p.description && (
                                    <span className="text-[10px] text-slate-400 font-normal sm:hidden line-clamp-2 leading-relaxed">
                                      {p.description}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-slate-500 font-medium hidden md:table-cell">{p.description || '-'}</td>
                              <td className="p-2 text-center hidden sm:table-cell">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  p.isActive 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {p.isActive ? 'Tersedia' : 'Habis / Nonaktif'}
                                </span>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {deleteConfirmPerfumeId === p.id ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                                    <span className="text-[10px] text-rose-700 font-bold px-1 select-none">Yakin Hapus?</span>
                                    <button
                                      onClick={() => {
                                        const updated = perfumes.filter(item => item.id !== p.id);
                                        setPerfumes(updated);
                                        LaughDryDatabase.savePerfumes(updated);
                                        setDeleteConfirmPerfumeId(null);
                                        triggerToast("💾 Parfum aromaterapi berhasil dihapus!");
                                      }}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      Ya
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmPerfumeId(null)}
                                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingPerfumeId(p.id);
                                        setPerfumeForm({ name: p.name, description: p.description || '', isActive: p.isActive !== false, icon: p.icon || '🌸' });
                                        setShowAddPerfume(true);
                                      }}
                                      className="p-1 px-2 border border-slate-250 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-all text-slate-700 font-bold cursor-pointer hover:shadow-2xs text-[11px]"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmPerfumeId(p.id)}
                                      className="p-1.5 border border-rose-200 hover:bg-rose-50 hover:border-rose-400 rounded-lg text-rose-600 transition-all cursor-pointer hover:shadow-xs"
                                      title="Hapus Parfum"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* 4. OPERATIONAL EXPENSES (OPEX) ACCORDION */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4" id="section-expenses">
          <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150">
            <div className="flex items-center gap-2">
              <span className="text-sm">💸</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Pengeluaran Usaha</span>
            </div>
          </div>
          <div className="p-4 space-y-6 animate-fadeIn" id="expense-accounting-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Pembukuan Pengeluaran Cabang (Operational Expenditure)</h3>
            <button
              onClick={() => {
                setShowAddExpense(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              id="btn-add-expense"
            >
              <Plus className="w-4 h-4" /> Catat Pengeluaran Baru
            </button>
          </div>

          {/* Date Picker Range Filter Bar */}
          <div className="bg-slate-100/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Filter Jangka Waktu Pengeluaran:</span>
              <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-black uppercase">Live Range Bound</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={expenseStartDate}
                  onChange={(e) => setExpenseStartDate(e.target.value)}
                  className="bg-white border border-slate-205 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={expenseEndDate}
                  onChange={(e) => setExpenseEndDate(e.target.value)}
                  className="bg-white border border-slate-205 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>
              {(expenseStartDate !== '2026-05-01' || expenseEndDate !== '2026-05-30') && (
                <button
                  type="button"
                  onClick={() => {
                    setExpenseStartDate('2026-05-01');
                    setExpenseEndDate('2026-05-30');
                  }}
                  className="p-2 px-3 bg-slate-250 hover:bg-slate-300 rounded-xl font-bold transition text-slate-700 hover:text-slate-900"
                  title="Reset Filter Tanggal"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Form Add Expense Pop up Modal */}
          {showAddExpense && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans text-xs">
              <form onSubmit={handleAddExpenseSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 max-w-xl w-full animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span>{editingExpenseId ? '✏️ Edit Catatan Pengeluaran Kas Operasional' : '💸 Catat Pengeluaran Kas Operasional'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpense(false);
                      setEditingExpenseId(null);
                      setExpenseForm({ description: '', category: 'Detergen/Softener', amount: 0, branchId: 'br-1' });
                    }}
                    className="text-slate-400 hover:text-slate-650 font-black text-xs cursor-pointer bg-slate-100 hover:bg-slate-200 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Deskripsi Pengeluaran:</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="Contoh: Beli Token Listrik Utama"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-650 focus:outline-none"
                      id="expense-desc-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Kategori OPEX:</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-650 focus:outline-none"
                      id="expense-category-input"
                    >
                      <option value="Gaji">Gaji</option>
                      <option value="Listrik">Listrik</option>
                      <option value="Air">Air</option>
                      <option value="Sewa">Sewa</option>
                      <option value="Perlengkapan">Perlengkapan</option>
                      <option value="Detergen/Softener">Detergen/Softener</option>
                      <option value="Transportasi">Transportasi</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Tanggal Pengeluaran:</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-650 focus:outline-none font-semibold"
                      id="expense-date-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Jumlah Pengeluaran (Rp):</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setExpenseForm({ ...expenseForm, amount: val });
                      }}
                      placeholder="150.000 atau 150000"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-650 focus:outline-none"
                      id="expense-amount-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Alokasi Cabang:</label>
                    <select
                      value={expenseForm.branchId}
                      onChange={(e) => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:border-red-650 focus:outline-none"
                      id="expense-branch-input"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="flex justify-end gap-2 text-xs pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpense(false);
                      setEditingExpenseId(null);
                      setExpenseForm({ description: '', category: 'Detergen/Softener', amount: 0, branchId: 'br-1' });
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                    id="btn-cancel-expense"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
                    id="btn-submit-expense"
                  >
                    {editingExpenseId ? '✏️ Simpan Perubahan' : 'Rekam Pengeluaran'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-xs uppercase">Jurnal Jurnal Pengeluaran</span>
              <span className="text-[11px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">Total: Rp {totalOPEX.toLocaleString()}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Deskripsi</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Cabang</th>
                    <th className="p-3">Oleh</th>
                    <th className="p-3 text-right">Jumlah (OPEX)</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.slice(0).reverse().map(e => {
                    const branchMock = branches.find(b => b.id === e.branchId);
                    const isEditing = editingExpenseId === e.id;
                    return (
                      <tr key={e.id} className={`hover:bg-slate-50/50 ${isEditing ? 'bg-amber-50/70 border-y border-amber-200/50 animate-pulse' : ''}`}>
                        <td className="p-3 font-mono text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{e.description}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{branchMock ? branchMock.name : 'Cabang Utama'}</td>
                        <td className="p-3 text-slate-400">{e.recordedBy || 'Owner'}</td>
                        <td className="p-3 text-right font-black text-rose-600">Rp {e.amount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => startEditExpense(e)}
                              className="p-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              title="Edit Pengeluaran"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmExpense(e)}
                              className="p-1 text-slate-600 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                              title="Hapus Pengeluaran"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 4.5. OWNER & STAFF MANAGEMENT MODULE */}
      {activeSubTab === 'owner_mgmt' && (
        <div className="space-y-6 mt-4 animate-fadeIn" id="section-owner-mgmt">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <span className="text-white text-xs font-black uppercase tracking-wider bg-indigo-500/30 px-2 py-0.5 rounded-md">MASTER SYSTEM AREA</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">Owner & Staff Management</h3>
              <p className="text-xs text-indigo-200 mt-1">
                Kelola kredensial owner, atur dan validasi izin operasional (hak akses) dari staf kasir langsung ke database Firebase live.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto">
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Apakah Anda yakin ingin mensinkronkan ulang semua master data dari Firestore sekarang?")) {
                    try {
                      await LaughDryDatabase.syncFromFirestore();
                      loadDatabaseState();
                      triggerToast("🔄 Sinkronasi database live berhasil!");
                    } catch(e) {
                      triggerToast("❌ Gagal mengunduh sync dari database.");
                    }
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🔄 Sync Live Firestore</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMN 1: Owner Profile Form & Store settings (5 cols) */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              
              {/* OWNER PROFILE */}
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔑</span>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Form Kredensial Owner</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">usr-1</span>
                </div>

                <form onSubmit={handleSaveOwner} className="p-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">Nama Lengkap Owner</label>
                    <input
                      type="text"
                      required
                      value={ownerForm.name}
                      onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                      placeholder="Masukkan nama owner"
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">Username Login</label>
                    <input
                      type="text"
                      required
                      value={ownerForm.username}
                      onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      placeholder="Masukkan username login"
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">E-mail Terdaftar</label>
                    <input
                      type="email"
                      required
                      value={ownerForm.email}
                      onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                      placeholder="Masukkan email terdaftar"
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">Password Baru</label>
                    <input
                      type="text"
                      required
                      value={ownerForm.password}
                      onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                      placeholder="Masukkan password baru"
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <span>💾 Simpan Kredensial &amp; Sinkronasi Live</span>
                  </button>
                </form>
              </div>

              {/* STORE PROPERTIES */}
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📐</span>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Konfigurasi Nilai &amp; Poin Usaha</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full">Global Settings</span>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-450 uppercase">Multiplier Poin (IDR)</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.pointsMultiplier}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...settings, pointsMultiplier: val };
                          setSettings(updated);
                          LaughDryDatabase.saveSettings(updated);
                          LaundryService.saveSettings(updated).catch(err => console.error("Gagal save settings:", err));
                          triggerToast("⚙️ Multiplier Poin diperbarui!");
                        }}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                      <span className="text-[8.5px] text-slate-400 block font-medium leading-tight mt-0.5">Minimal belanja untuk dapat 1 poin.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-450 uppercase">Nilai Per 1 Poin (IDR)</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.pointsValue}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...settings, pointsValue: val };
                          setSettings(updated);
                          LaughDryDatabase.saveSettings(updated);
                          LaundryService.saveSettings(updated).catch(err => console.error("Gagal save settings:", err));
                          triggerToast("⚙️ Nilai penukaran poin diperbarui!");
                        }}
                        className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                      <span className="text-[8.5px] text-slate-400 block font-medium leading-tight mt-0.5">Potongan diskon yang didapat per 1 poin.</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">Bluetooth Printer Address MAC</label>
                    <input
                      type="text"
                      value={settings.bluetoothPrinterAddress || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = { ...settings, bluetoothPrinterAddress: val };
                        setSettings(updated);
                        LaughDryDatabase.saveSettings(updated);
                        LaundryService.saveSettings(updated).catch(err => console.error("Gagal save settings:", err));
                      }}
                      placeholder="e.g. 00:11:22:33:FF:EE"
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase">Warna Aksen Sistem (Brand Color)</label>
                    <div className="flex gap-2.5 pt-1">
                      {[
                        { color: '#6366f1', name: 'Indigo' },
                        { color: '#3b82f6', name: 'Biru' },
                        { color: '#10b981', name: 'Emerald' },
                        { color: '#f59e0b', name: 'Amber' },
                        { color: '#8b5cf6', name: 'Ungu' },
                        { color: '#ec4899', name: 'Pink' }
                      ].map((c) => {
                        const isCurrent = settings.accentColor === c.color || (c.name === 'Indigo' && !settings.accentColor);
                        return (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => {
                              const updated = { ...settings, accentColor: c.color };
                              setSettings(updated);
                              LaughDryDatabase.saveSettings(updated);
                              LaundryService.saveSettings(updated).catch(err => console.error("Gagal save settings:", err));
                              triggerToast(`🎨 Warna Brand diset ke: ${c.name}`);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition transform active:scale-90 cursor-pointer ${
                              isCurrent ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 2: Staff List with granular checkboxes (7 cols) */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-6">
              
              {/* STAFF LIST */}
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👥</span>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Atur Hak Akses / Izin Karyawan (Kasir)</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
                    {users.filter(u => u.role === 'karyawan').length} Karyawan Aktif
                  </span>
                </div>

                <div className="p-4 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {users.filter(u => u.role === 'karyawan').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-400 font-bold">Belum ada akun kasir/karyawan terdaftar.</p>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('cashiers')}
                        className="mt-2 text-indigo-600 hover:text-indigo-700 font-extrabold text-xs"
                      >
                        Tambah Akun Kasir Baru →
                      </button>
                    </div>
                  ) : (
                    users.filter(u => u.role === 'karyawan').map((emp: any) => {
                      const permissions = emp.permissions || [];
                      const branch = branches.find(b => b.id === emp.branchId);

                      return (
                        <div key={emp.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          {/* Left section: staff details */}
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(emp.name)}`}
                              alt={emp.name}
                              className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{emp.name}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">@{emp.username} | {emp.email}</p>
                              <span className="inline-block mt-1 text-[8.5px] font-black text-rose-600 bg-rose-50 border border-rose-150 px-1.5 py-0.5 rounded">
                                📍 Penempatan: {branch ? branch.name : 'Cabang Utama'}
                              </span>
                            </div>
                          </div>

                          {/* Right section: checkboxes config */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 w-full md:w-auto space-y-2">
                            <div className="text-[8.5px] font-extrabold text-slate-450 uppercase tracking-wider">Daftar Izin &amp; Hak Akses Live (Database)</div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                              {[
                                { key: 'create_order', label: 'Buat/Proses Order' },
                                { key: 'view_reports', label: 'Lihat Keuangan/Laporan' },
                                { key: 'manage_expenses', label: 'Tulis Pengeluaran' },
                                { key: 'manage_attendance', label: 'Kelola Absensi' }
                              ].map(perm => {
                                const hasPerm = permissions.includes(perm.key) || permissions.includes('all');
                                return (
                                  <label key={perm.key} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={hasPerm}
                                      onChange={() => handleTogglePermission(emp.id, perm.key)}
                                      className="w-3.5 h-3.5 accent-slate-900 border-slate-300 rounded focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-slate-650">{perm.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* FULL WIDTH BOTTOM CARD: PRODUCTION DEPLOY & RESET PURGE */}
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🧹</span>
                <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wider">Persiapan Rilis Produksi &amp; Hapus Data Uji Coba (Sandbox)</h4>
              </div>
              <p className="text-xs text-red-700 leading-relaxed max-w-3xl">
                Menghapus seluruh database transaksi simulasi, list pesanan/order, laporan pengeluaran, daftar pelanggan, serta absensi karyawan. Akun owner, master cabang utama, dan master tarif layanan akan dipertahankan dalam kondisi murni (bersih) agar aplikasi langsung siap digunakan oleh operasional toko sungguhan.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (confirm("🚨 PERINGATAN: Seluruh data order, pelanggan, pengeluaran &amp; absensi simulasi akan DIHAPUS PERMANEN dari Firebase Firestore untuk live rilis produksi. Apakah Anda yakin?")) {
                  try {
                    await executeResetDatabase();
                    triggerToast("🧹 Database bersih! Berhasil masuk ke Mode Rilis Produksi (Clean Slate).");
                  } catch (e) {
                    triggerToast("❌ Gagal membersihkan data live.");
                  }
                }
              }}
              className="px-5 py-3 md:py-2.5 bg-red-650 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-red-650/25 active:scale-95 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer hover:border hover:border-red-500"
            >
              <span>🧼 Bersihkan LIVE Database &amp; Siapkan Launch</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. SETTINGS, TEMPLATE WA & LOYALTY RULES ACCORDION */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4 animate-fadeIn" id="section-settings">
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔧</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Pengaturan & WA Templates Workspace</span>
            </div>

            {/* Inner Sub tabs selection */}
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-250 self-start sm:self-auto gap-0.5">
              <button
                type="button"
                onClick={() => setSettingsInnerTab('general')}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                  settingsInnerTab === 'general'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚙️ Pengaturan
              </button>
              <button
                type="button"
                onClick={() => setSettingsInnerTab('receipt')}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                  settingsInnerTab === 'receipt'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🖨️ Element Struk Fisik
              </button>
              <button
                type="button"
                onClick={() => setSettingsInnerTab('wa')}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                  settingsInnerTab === 'wa'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💬 Nota WA
              </button>
            </div>
          </div>
          <div className="p-4 space-y-6" id="templates-wa-panel">
          
          {/* Integrasi Tracking & Vercel Domain Configuration */}
          {settingsInnerTab === 'general' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-xs animate-scaleIn">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              Integrasi Web Tracking (Vercel & WhatsApp CRM)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-600 block font-semibold">Domain Web Vercel (Tracking URL Base):</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-mono text-xs select-none">URL:</span>
                  <input
                    type="text"
                    value={settings.vercelTrackingUrl || ''}
                    onChange={(e) => handleSettingsChange('vercelTrackingUrl', e.target.value)}
                    placeholder="https://laughdry.vercel.app"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pl-12 focus:bg-white focus:outline-none focus:border-sky-500 font-mono"
                    id="vercel-tracking-url-input"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Pengaturan Tema Warna Identitas Brand (Custom Accent Color) */}
          {settingsInnerTab === 'general' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-xs animate-scaleIn">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="text-base text-sky-500">🎨</span>
              Kustomisasi Tema Warna Brand Laundry (Accent Color)
            </h4>

            <div className="space-y-3">
              <label className="text-slate-600 block font-semibold">Pilih Palet Warna Populer:</label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { name: 'Sky Sparkle (Def)', value: '#3b82f6' },
                  { name: 'Fresh Teal/Mint', value: '#10b981' },
                  { name: 'Aroma Lavender', value: '#8b5cf6' },
                  { name: 'Sunset Orange', value: '#f97316' },
                  { name: 'Elegant Clean Slate', value: '#1e293b' },
                  { name: 'Rose Petal', value: '#f43f5e' },
                ].map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleSettingsChange('accentColor', color.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      settings.accentColor === color.value
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md font-black'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: color.value }}></span>
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-slate-600 block font-semibold text-[11px]">Kustomisasi Nilai Hex Warna & Color Picker:</label>
                <div className="flex gap-2 max-w-sm">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold select-none text-xs">Hex:</span>
                    <input
                      type="text"
                      maxLength={7}
                      value={settings.accentColor || '#3b82f6'}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#')) val = '#' + val;
                        handleSettingsChange('accentColor', val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-10 focus:bg-white focus:outline-none focus:border-slate-500 font-mono text-xs font-bold"
                    />
                  </div>
                  <input
                    type="color"
                    value={settings.accentColor || '#3b82f6'}
                    onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                    className="w-10 h-8 p-0 border border-slate-200 rounded-lg cursor-pointer bg-transparent shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Teks Header & Footer, Pesan Iklan Struk */}
          {settingsInnerTab === 'general' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-xs animate-scaleIn">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              Teks Header, Footer & Catatan Promo Struk
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 block font-semibold">Teks Header Kustom (Header Nota):</label>
                <input
                  type="text"
                  value={settings.customReceiptHeader || ''}
                  onChange={(e) => handleSettingsChange('customReceiptHeader', e.target.value)}
                  placeholder="KOSONG (Menggunakan Nama Toko Default)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-sky-500 text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400 font-medium">Judul utama di atas struk cetak. Kosongkan untuk memakai nama cabang.</p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 block font-semibold">Teks Footer Kustom (Catatan Kaki S&K):</label>
                <input
                  type="text"
                  value={settings.customReceiptFooter || ''}
                  onChange={(e) => handleSettingsChange('customReceiptFooter', e.target.value)}
                  placeholder="KOSONG (Menggunakan Syarat & Ketentuan Default)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-sky-500 text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400 font-medium">Pesan penutup ketentuan S&K di akhir struk nota.</p>
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-slate-600 block font-semibold">Pesan Iklan Promosi Footer:</label>
                <input
                  type="text"
                  value={settings.customReceiptPromo || ''}
                  onChange={(e) => handleSettingsChange('customReceiptPromo', e.target.value)}
                  placeholder="KOSONG (Tanpa pesan promosi)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-sky-500 text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400 font-medium">Pesan iklan promosi kustom (cth: "DISKON 15% MEMBER BARU!") di bawah S&K.</p>
              </div>
            </div>
          </div>
          )}

          {/* QRIS INTEGRATION & ID MERCHANT */}
          {settingsInnerTab === 'general' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-xs animate-scaleIn">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-sky-500 shrink-0" />
              <div>
                <b className="font-extrabold text-slate-800 text-sm uppercase tracking-wider block">📲 QRIS INTEGRASI & ID MERCHANT</b>
              </div>
            </div>

            <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-150 space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-600 block font-bold text-[10px] uppercase">Format Tipe Pembayaran QRIS:</label>
                  <select
                    value={settings.qrisType || 'none'}
                    onChange={(e) => handleSettingsChange('qrisType', e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-sky-500 text-xs font-bold text-slate-700 pointer-events-auto"
                  >
                    <option value="none">Sembunyikan QRIS (None)</option>
                    <option value="static">QRIS Statis (Master Merchant Code Tetap)</option>
                    <option value="dynamic">QRIS Dinamis (Auto-Generated Midtrans API)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 block font-bold text-[10px] uppercase">Merchant ID Pembayaran (NMID / API ID):</label>
                  <input
                    type="text"
                    value={settings.qrisMerchantId || ''}
                    onChange={(e) => handleSettingsChange('qrisMerchantId', e.target.value)}
                    placeholder="Contoh: ID1020304050607"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-sky-500 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              {settings.qrisType === 'static' && (
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-150 animate-scaleIn">
                  <span className="text-[10px] font-bold text-slate-600 block mb-1">🖼️ Link Foto QR Code QRIS Statis Usaha (Opsional):</span>
                  <div className="flex items-center gap-3">
                    {settings.qrisStaticQrUrl ? (
                      <div className="relative group shrink-0">
                        <img 
                          src={settings.qrisStaticQrUrl} 
                          alt="QRIS Static QR" 
                          className="w-12 h-12 rounded-lg border border-slate-250 object-contain bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSettingsChange('qrisStaticQrUrl', '')}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold p-0.5 rounded-full text-[8px] h-4 w-4 flex items-center justify-center cursor-pointer shadow"
                          title="Hapus gambar QRIS"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-350 bg-slate-50 shrink-0">
                        <span>📱</span>
                      </div>
                    )}

                    <label className="flex-1">
                      <span className="p-2 px-3 bg-sky-500 hover:bg-sky-600 hover:shadow text-[10.5px] font-extrabold text-white rounded-xl cursor-pointer transition flex items-center justify-center gap-1 w-fit">
                        📂 Unggah Foto QRIS...
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                handleSettingsChange('qrisStaticQrUrl', event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[8.5px] text-slate-400">Pilih file gambar QR code toko Anda, atau biarkan kosong untuk secara otomatis men-generate Master QRIS berlogo resmi.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  LaughDryDatabase.saveSettings(settings);
                  triggerToast("💾 Semua pengaturan umum berhasil disimpan!");
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-850 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>💾 SIMPAN PENGATURAN</span>
              </button>
            </div>
          </div>
          )}

          {/* Kustomisasi Struk Nota Fisik / Thermal */}
          {settingsInnerTab === 'receipt' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 font-sans text-xs animate-scaleIn">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-500 animate-pulse" />
              Kustomisasi Layout Struk Fisik / Thermal
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Controls & Element Row Options */}
              <div className="lg:col-span-12 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* UPLOADER LOGO HEADER */}
                  <div className="space-y-1 bg-sky-50/35 p-3.5 border border-dashed border-sky-300 rounded-2xl col-span-1 md:col-span-2 shadow-xs">
                    <label className="text-sky-850 block font-black text-[11px] uppercase tracking-wider flex items-center justify-between gap-1.5">
                      <span>🖼️ Logo Header Cetak Fisik:</span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!settings.showHeaderLogoInReceipt}
                          onChange={(e) => handleSettingsChange('showHeaderLogoInReceipt', e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer ml-auto"
                        />
                        <span className="text-[10px] text-sky-800 font-bold normal-case">Tampilkan Logo di Header</span>
                      </label>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-550">Upload Logo Header Struk (Thermal Header Logo):</p>
                        <p className="text-[9px] text-slate-400">Gambar/foto ini akan dicetak di posisi paling atas (header) struk sebelum nama toko.</p>
                      </div>

                      <div className="space-y-2 border-l border-slate-100 pl-0 md:pl-4">
                        <div className="flex items-center gap-3">
                          {settings.customReceiptHeaderLogoImg ? (
                            <div className="relative group shrink-0">
                              <img 
                                src={settings.customReceiptHeaderLogoImg} 
                                alt="Receipt Header Logo" 
                                className="w-12 h-12 rounded-lg border border-slate-250 object-contain bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSettingsChange('customReceiptHeaderLogoImg', '')}
                                className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold p-0.5 rounded-full text-[8px] h-4 w-4 flex items-center justify-center cursor-pointer shadow"
                                title="Hapus foto logo header"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-350 shrink-0">
                              <span className="text-lg">📷</span>
                            </div>
                          )}

                          <label className="flex-1">
                            <span className="p-2 px-3 bg-sky-500 hover:bg-sky-600 hover:shadow text-[10.5px] font-extrabold text-white rounded-xl cursor-pointer transition flex items-center justify-center gap-1">
                              📂 Pilih Logo...
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      handleSettingsChange('customReceiptHeaderLogoImg', event.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <p className="text-[9px] text-slate-400">Gunakan file gambar kustom agar tercetak rapi di atas struk.</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* MS Word Real-time Receipt Elements Editor */}
                {settingsInnerTab === 'receipt' && (
                <div className="space-y-3.5 border-t border-slate-100 pt-5 mt-5 animate-scaleIn">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">📝 Element Style Struk Fisik:</h5>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                    {(settings.receiptElements || [
                      { id: 'outlet_name', label: 'Nama Outlet / Cabang', fontSize: 13, alignment: 'center', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'invoice_number', label: 'Nomor Nota Transaksi', fontSize: 11, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'customer_name', label: 'Nama Lengkap Pelanggan', fontSize: 13, alignment: 'left', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'customer_phone', label: 'Nomor HP Pelanggan', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'order_date', label: 'Tanggal Transaksi', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'cashier_info', label: 'Informasi Kasir', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'order_status', label: 'Status Pembayaran', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'estimated_time', label: 'Estimasi Ambil Cucian', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'perfume_fragrance', label: 'Aroma Parfum Terpilih', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'item_list', label: 'Daftar Cucian & Harga', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'total_charge', label: 'Total Tagihan Biaya', fontSize: 12, alignment: 'right', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'member_points', label: 'Poin Member', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                      { id: 'footer_terms', label: 'Catatan & Ucapan Terima Kasih', fontSize: 9, alignment: 'center', isBold: false, isVisible: true, showPrefix: true, isItalic: false }
                    ]).map((el: any) => {
                      const updateElementOption = (id: string, key: string, val: any) => {
                        const currentElements = settings.receiptElements || [
                          { id: 'outlet_name', label: 'Nama Outlet / Cabang', fontSize: 13, alignment: 'center', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'invoice_number', label: 'Nomor Nota Transaksi', fontSize: 11, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'customer_name', label: 'Nama Lengkap Pelanggan', fontSize: 13, alignment: 'left', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'customer_phone', label: 'Nomor HP Pelanggan', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'order_date', label: 'Tanggal Transaksi', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'cashier_info', label: 'Informasi Kasir', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'order_status', label: 'Status Pembayaran', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'estimated_time', label: 'Estimasi Ambil Cucian', fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'perfume_fragrance', label: 'Aroma Parfum Terpilih', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'item_list', label: 'Daftar Cucian & Harga', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'total_charge', label: 'Total Tagihan Biaya', fontSize: 12, alignment: 'right', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'member_points', label: 'Poin Member', fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                          { id: 'footer_terms', label: 'Catatan & Ucapan Terima Kasih', fontSize: 9, alignment: 'center', isBold: false, isVisible: true, showPrefix: true, isItalic: false }
                        ];
                        const updated = currentElements.map((item: any) => item.id === id ? { ...item, [key]: val } : item);
                        handleSettingsChange('receiptElements', updated);
                      };

                      const isExpanded = expandedElementId === el.id;

                      return (
                        <div key={el.id} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white mb-2 pb-0.5">
                          <div className={`flex flex-col sm:flex-row justify-between sm:items-center p-3 transition-all ${
                            el.isVisible ? 'bg-white' : 'bg-slate-100/60 text-slate-400 opacity-60'
                          }`}>
                            <div>
                              <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 capitalize">
                                <span className={`w-2 h-2 rounded-full ${el.isVisible ? 'bg-rose-500' : 'bg-slate-300'}`}></span>
                                {el.label}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Font: <span className="font-bold text-slate-600">{el.fontSize || 10}px</span> &bull; Align: <span className="font-bold text-slate-600 capitalize">{el.alignment}</span> &bull; Ketebalan: <span className="font-bold text-slate-600">{el.isBold ? 'Bold' : 'Regular'}</span>{el.showPrefix === false && " &bull; Tanpa Label"}{el.isItalic && " &bull; Italic"}
                              </div>
                            </div>

                            {/* Toolbar controls like MS Word */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0 font-sans">
                              {/* Accordion Detail Button */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedElementId(isExpanded ? null : el.id)}
                                  className={`p-1 px-2.5 rounded-lg transition text-[11px] font-black cursor-pointer flex items-center gap-1 ${
                                    isExpanded ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                  }`}
                                  title="Edit Detail Format, Sembunyikan Label (Prefix), Teks Italic, dll"
                                >
                                  {isExpanded ? '✕ Tutup' : '🛠️ Sembunyikan Label / Ukuran'}
                                </button>

                              <span className="w-px h-5 bg-slate-200"></span>

                              {/* Visibility Toggle */}
                              <button
                                type="button"
                                onClick={() => updateElementOption(el.id, 'isVisible', !el.isVisible)}
                                className={`p-1 px-2 rounded-lg transition text-[11px] font-bold cursor-pointer ${
                                  el.isVisible ? 'bg-white text-slate-700 hover:bg-slate-100 shadow-xs border border-slate-150' : 'bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200'
                                }`}
                                title={el.isVisible ? "Sembunyikan" : "Tampilkan"}
                              >
                                {el.isVisible ? '👁️ Muncul' : '🙈 Sembunyi'}
                              </button>

                              <span className="w-px h-5 bg-slate-200"></span>

                              {/* Font size adjustment */}
                              <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => updateElementOption(el.id, 'fontSize', Math.max(7, (el.fontSize || 11) - 1))}
                                  className="p-1 px-1.5 rounded text-slate-700 hover:bg-slate-100 text-[10px] font-black cursor-pointer"
                                  title="Kecilkan Font (A-)"
                                >
                                  A-
                                </button>
                                <span className="text-[10px] font-black text-slate-800 px-1 font-mono min-w-[28px] text-center">
                                  {(el.fontSize || 11)}px
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateElementOption(el.id, 'fontSize', Math.min(26, (el.fontSize || 11) + 1))}
                                  className="p-1 px-1.5 rounded text-slate-700 hover:bg-slate-100 text-[10px] font-black cursor-pointer"
                                  title="Besarkan Font (A+)"
                                >
                                  A+
                                </button>
                              </div>

                              <span className="w-px h-5 bg-slate-200"></span>

                              {/* Bold Selector (B) */}
                              <button
                                type="button"
                                onClick={() => updateElementOption(el.id, 'isBold', !el.isBold)}
                                className={`px-2.5 py-1 rounded-lg transition-all font-serif text-[11px] font-black cursor-pointer ${
                                  el.isBold ? 'bg-slate-800 text-white shadow-sm scale-105 font-black' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-150'
                                }`}
                                title="Tebalkan Font (B)"
                              >
                                B
                              </button>

                              <span className="w-px h-5 bg-slate-200"></span>

                              {/* Alignment option */}
                              <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs">
                                {(['left', 'center', 'right'] as const).map((align) => (
                                  <button
                                    key={align}
                                    type="button"
                                    onClick={() => updateElementOption(el.id, 'alignment', align)}
                                    className={`p-1 px-1.5 rounded text-[10px] uppercase font-black transition cursor-pointer ${
                                      el.alignment === align ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-50'
                                    }`}
                                    title={`Rata ${align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'}`}
                                  >
                                    {align === 'left' ? '⬅️' : align === 'center' ? '↕️' : '➡️'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Expansion Detail Menu */}
                          {isExpanded && (
                            <div className="border-t border-slate-150 p-3 bg-slate-50/75 space-y-3.5 animate-fadeIn text-xs">
                              <div className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5">
                                <span>⚙️ Editor Presisi Element: {el.label}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Hide Prefix Option */}
                                {['customer_name', 'invoice_number', 'order_date', 'perfume_fragrance'].includes(el.id) && (
                                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-xl">
                                    <input
                                      type="checkbox"
                                      checked={el.showPrefix !== false}
                                      onChange={(e) => updateElementOption(el.id, 'showPrefix', e.target.checked)}
                                      className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div>
                                      <span className="font-extrabold text-slate-850 block text-[10.5px]">Tampilkan Teks Label / Prefiks</span>
                                      <span className="text-[8.5px] text-slate-450 leading-tight block mt-0.5">Centang agar label seperti "Cust:" tetap tercetak. Hilangkan centang agar tercetak datanya saja (misal: "Budi Hartono" saja).</span>
                                    </div>
                                  </label>
                                )}

                                {/* Italic Toggle */}
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-xl">
                                  <input
                                    type="checkbox"
                                    checked={!!el.isItalic}
                                    onChange={(e) => updateElementOption(el.id, 'isItalic', e.target.checked)}
                                    className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                                  />
                                  <div>
                                    <span className="font-extrabold text-slate-850 block text-[10.5px]">Cetak Tulisan Miring (Italic)</span>
                                    <span className="text-[8.5px] text-slate-450 leading-tight block mt-0.5">Aktifkan format italic khusus untuk memberikan efek estetika pada pratinjau struk.</span>
                                  </div>
                                </label>

                                {/* Fine-grain size slider */}
                                <div className="bg-white p-2.5 border border-slate-200 rounded-xl sm:col-span-2 space-y-1">
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="font-extrabold text-slate-850">Ukuran Tinggi Huruf Elemen (Font Size)</span>
                                    <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-mono text-xs">{el.fontSize || 11}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="8"
                                    max="24"
                                    value={el.fontSize || 10}
                                    onChange={(e) => updateElementOption(el.id, 'fontSize', parseInt(e.target.value))}
                                    className="w-full accent-rose-600 cursor-pointer"
                                  />
                                  <p className="text-[8.5px] text-slate-400">Atur ukuran elemen ini (misal ingin nama pelanggan berukuran font 15 agar rata tengah dan menonjol).</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}

                  {/* Save Settings & Trigger Receipt Preview Popup */}
                  {settingsInnerTab === 'receipt' && (
                  <div className="pt-2 animate-scaleIn">
                    <button
                      type="button"
                      onClick={() => {
                        LaughDryDatabase.saveSettings(settings);
                        triggerToast("💾 Setelan elemen struk fisik berhasil disimpan!");
                        setShowReceiptPreviewPopup(true);
                      }}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer w-full text-center"
                    >
                      <Printer className="w-4 h-4" />
                      <span>💾 SIMPAN ELEMEN & LIHAT PRATINJAU STRUK FISIK</span>
                    </button>
                  </div>
                  )}

                  {/* QRIS PAYMENTS CONFIGURATION */}
                  <div className="space-y-4 border-t border-slate-100 pt-5 mt-5">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-sky-500 shrink-0" />
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">📲 QRIS INTEGRASI & ID MERCHANT:</h5>
                      </div>
                    </div>

                    <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-150 space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-600 block font-bold text-[10px] uppercase">Format Tipe Pembayaran QRIS:</label>
                          <select
                            value={settings.qrisType || 'none'}
                            onChange={(e) => handleSettingsChange('qrisType', e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-sky-500 text-xs font-bold text-slate-700"
                          >
                            <option value="none">Sembunyikan QRIS (None)</option>
                            <option value="static">QRIS Statis (Master Merchant Code Tetap)</option>
                            <option value="dynamic">QRIS Dinamis (Auto-Generated Midtrans API)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-600 block font-bold text-[10px] uppercase">Merchant ID Pembayaran (NMID / API ID):</label>
                          <input
                            type="text"
                            value={settings.qrisMerchantId || ''}
                            onChange={(e) => handleSettingsChange('qrisMerchantId', e.target.value)}
                            placeholder="Contoh: ID1020304050607"
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-sky-500 text-xs text-slate-800 font-mono"
                          />
                        </div>
                      </div>

                      {settings.qrisType === 'static' && (
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-600 block mb-1">🖼️ Link Foto QR Code QRIS Statis Usaha (Opsional):</span>
                          <div className="flex items-center gap-3">
                            {settings.qrisStaticQrUrl ? (
                              <div className="relative group shrink-0">
                                <img 
                                  src={settings.qrisStaticQrUrl} 
                                  alt="QRIS Static QR" 
                                  className="w-12 h-12 rounded-lg border border-slate-250 object-contain bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSettingsChange('qrisStaticQrUrl', '')}
                                  className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold p-0.5 rounded-full text-[8px] h-4 w-4 flex items-center justify-center cursor-pointer shadow"
                                  title="Hapus gambar QRIS"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="w-12 h-12 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-350 bg-slate-50 shrink-0">
                                <span className="text-lg">📱</span>
                              </div>
                            )}

                            <label className="flex-1">
                              <span className="p-2 px-3 bg-sky-500 hover:bg-sky-600 hover:shadow text-[10.5px] font-extrabold text-white rounded-xl cursor-pointer transition flex items-center justify-center gap-1 w-fit">
                                📂 Unggah Foto QRIS...
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (event.target?.result) {
                                        handleSettingsChange('qrisStaticQrUrl', event.target.result as string);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-[8.5px] text-slate-400">Pilih file gambar QR code toko Anda, atau biarkan kosong untuk secara otomatis men-generate Master QRIS berlogo resmi.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SAVE BUTTON */}
                  <div className="pt-4 flex justify-end border-t border-slate-100 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        LaughDryDatabase.saveSettings(settings);
                        triggerToast("💾 Semua perubahan setelan struk berhasil disimpan permanen ke database!");
                      }}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-rose-450 border border-slate-800 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <span>💾 SIMPAN SETELAN STRUK</span>
                    </button>
                  </div>
                </div>

              {/* Hiden Right Column structure to keep compilation pristine */}
              <div style={{ display: 'none' }} className="hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-slate-400/25 backdrop-blur-xs"></div>
                
                <div className="w-full text-center pb-2.5 border-b border-rose-100 mb-4">
                  <h5 className="font-extrabold text-[12px] text-slate-800 tracking-wider flex items-center justify-center gap-1.5 uppercase font-sans">
                    🖨️ Live Pratinjau Struk Fisik (58mm)
                  </h5>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Berubah real-time sesuai preferensi Anda</p>
                </div>

                {/* Simulated printer feeder slot */}
                <div className="w-full max-w-[215px] bg-slate-800 h-5 rounded-t-xl shadow-md border border-slate-700 relative flex items-center justify-center">
                  <div className="w-[85%] h-1 bg-black rounded-full shadow-inner"></div>
                </div>

                {/* Realistic Thermal Receipt Roll Mockout */}
                <div className="bg-white text-slate-950 font-mono p-4 w-full max-w-[215px] border-x border-b border-slate-300 shadow-xl relative select-all animate-fadeIn" style={{
                  backgroundImage: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #fafafa 100%)'
                }}>
                  {/* Decorative receipt tear zig-zag bottom */}
                  <div className="absolute -bottom-1.5 inset-x-0 h-1.5 overflow-hidden flex">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 bg-white border-b border-r border-slate-200 rotate-45 transform origin-top shrink-0 -mt-1.25 shadow-xs"></div>
                    ))}
                  </div>

                  {(() => {
                    const getElementStyle = (elementId: string) => {
                      const defaultStyles: {[key: string]: { fontSize: number, alignment: 'left' | 'center' | 'right', isBold: boolean, isVisible: boolean, showPrefix?: boolean, isItalic?: boolean }} = {
                        outlet_name: { fontSize: 13, alignment: 'center', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        invoice_number: { fontSize: 11, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        customer_name: { fontSize: 13, alignment: 'left', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        customer_phone: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        order_date: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        cashier_info: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        order_status: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        estimated_time: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        perfume_fragrance: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        item_list: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        total_charge: { fontSize: 12, alignment: 'right', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        member_points: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        footer_terms: { fontSize: 9, alignment: 'center', isBold: false, isVisible: true, showPrefix: true, isItalic: false }
                      };

                      const config = (settings.receiptElements || []).find((el: any) => el.id === elementId) || defaultStyles[elementId] || defaultStyles.invoice_number;
                      const alignClass = config.alignment === 'center' ? 'text-center' : config.alignment === 'right' ? 'text-right' : 'text-left';
                      const weightClass = config.isBold ? 'font-black' : 'font-semibold';
                      const italicClass = config.isItalic ? 'italic' : '';
                      
                      return {
                        style: {
                          fontSize: `${config.fontSize || 10}px`,
                        },
                        className: `${alignClass} ${weightClass} ${italicClass}`,
                        isVisible: config.isVisible !== false,
                        showPrefix: config.showPrefix !== false
                      };
                    };

                    return (
                      <div className="space-y-1 science-receipt-text select-none w-full">
                        {/* Header logo */}
                        {settings.showHeaderLogoInReceipt && settings.customReceiptHeaderLogoImg && (
                          <div className="flex justify-center mb-2 animate-fade-in text-center">
                            <img 
                              src={settings.customReceiptHeaderLogoImg} 
                              alt="Receipt Header Logo" 
                              className="w-14 h-14 object-contain rounded border border-slate-200 p-0.5 bg-white bg-opacity-90"
                            />
                          </div>
                        )}

                        {/* Outlet name / header */}
                        {(() => {
                          const s = getElementStyle('outlet_name');
                          if (!s.isVisible) return null;
                          const active = expandedElementId === 'outlet_name';
                          return (
                            <div 
                              style={s.style} 
                              onClick={() => setExpandedElementId('outlet_name')}
                              className={`uppercase tracking-tight whitespace-pre-line mb-1.5 leading-tight p-1 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                              }`}
                              title="Klik untuk rubah nama header / nama outlet"
                            >
                              {settings.customReceiptHeader || 'LAUGHDRY EXPRESS'}
                            </div>
                          );
                        })()}

                        {settings.showBranchPhone && (
                          <div className="font-bold text-slate-700 text-center text-[8px] mb-1">
                            TELP BRANCH: 0812-3456-7890
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-400 my-2"></div>

                        {/* Invoice & order meta information */}
                        <div className="space-y-0.5 text-slate-800">
                          {(() => {
                            const s = getElementStyle('invoice_number');
                            if (!s.isVisible) return null;
                            const active = expandedElementId === 'invoice_number';
                            return (
                              <div 
                                style={s.style} 
                                onClick={() => setExpandedElementId('invoice_number')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit no nota"
                              >
                                {s.showPrefix ? 'Nota  : LD-20260604-0012' : 'LD-20260604-0012'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('order_date');
                            if (!s.isVisible) return null;
                            const active = expandedElementId === 'order_date';
                            return (
                              <div 
                                style={s.style} 
                                onClick={() => setExpandedElementId('order_date')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit tanggal"
                              >
                                {s.showPrefix ? `Tgl   : ${new Date().toLocaleDateString('id-ID')}` : new Date().toLocaleDateString('id-ID')}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('customer_name');
                            if (!s.isVisible) return null;
                            const active = expandedElementId === 'customer_name';
                            return (
                              <div 
                                style={s.style} 
                                onClick={() => setExpandedElementId('customer_name')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit nama pelanggan"
                              >
                                {s.showPrefix ? 'Cust  : Budi Hartono' : 'Budi Hartono'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('customer_phone');
                            if (!s.isVisible || !settings.showCustomerPhoneInReceipt) return null;
                            const active = expandedElementId === 'customer_phone';
                            return (
                              <div 
                                style={s.style} 
                                onClick={() => setExpandedElementId('customer_phone')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit bagian nama/kontak pelanggan"
                              >
                                {s.showPrefix ? 'Telp  : 0812-7788-9900' : '0812-7788-9900'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('cashier_info');
                            if (!s.isVisible || !settings.showCashierNameInReceipt) return null;
                            const active = expandedElementId === 'cashier_info';
                            return (
                              <div 
                                style={s.style}
                                onClick={() => setExpandedElementId('cashier_info')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit info kasir"
                              >
                                {s.showPrefix ? 'Kasir : Amanda Kasir (POS)' : 'Amanda Kasir (POS)'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('order_status');
                            if (!s.isVisible) return null;
                            const active = expandedElementId === 'order_status';
                            return (
                              <div 
                                style={s.style}
                                onClick={() => setExpandedElementId('order_status')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit status"
                              >
                                {s.showPrefix ? 'Status: LUNAS via QRIS' : 'LUNAS via QRIS'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('estimated_time');
                            if (!s.isVisible || !settings.showEstimatedCompletion) return null;
                            const active = expandedElementId === 'estimated_time';
                            return (
                              <div 
                                style={s.style}
                                onClick={() => setExpandedElementId('estimated_time')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit estimasi"
                              >
                                {s.showPrefix ? 'Estim : 07/06/2026, 15:00' : '07/06/2026, 15:00'}
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('perfume_fragrance');
                            if (!s.isVisible) return null;
                            const active = expandedElementId === 'perfume_fragrance';
                            return (
                              <div 
                                style={s.style} 
                                onClick={() => setExpandedElementId('perfume_fragrance')}
                                className={`p-0.5 cursor-pointer transition-all duration-150 rounded ${s.className} ${
                                  active ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                }`}
                                title="Klik untuk edit aroma parfum"
                              >
                                {s.showPrefix ? 'Aroma : ✨ SWEET CANDY EXOTIC' : '✨ SWEET CANDY EXOTIC'}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Items list */}
                        {(() => {
                          const s = getElementStyle('item_list');
                          if (!s.isVisible) return null;
                          const active = expandedElementId === 'item_list';
                          return (
                            <div 
                              onClick={() => setExpandedElementId('item_list')}
                              className={`cursor-pointer transition-all duration-150 rounded ${
                                active ? 'ring-2 ring-rose-500 bg-rose-50/30 p-1' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350 p-0.5'
                              }`}
                              title="Klik untuk edit daftar item"
                            >
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              <div style={s.style} className={`space-y-2 ${s.className}`}>
                                <div className="space-y-0.5 text-left">
                                  <div className="font-extrabold text-slate-950 leading-tight">Cuci Setrika Reguler - Kiloan</div>
                                  <div className="flex justify-between text-slate-600 text-[8.5px]">
                                    <span>3 KG x @Rp 8.000</span>
                                    <span className="font-black text-slate-950">Rp 24.000</span>
                                  </div>
                                </div>
                                <div className="space-y-0.5 text-left">
                                  <div className="font-extrabold text-slate-950 leading-tight">Bedcover Large - Satuan</div>
                                  <div className="flex justify-between text-slate-600 text-[8.5px]">
                                    <span>1 PCS x @Rp 35.000</span>
                                    <span className="font-black text-slate-950">Rp 35.000</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Charges calculation */}
                        {(() => {
                          const s = getElementStyle('total_charge');
                          if (!s.isVisible) return null;
                          const active = expandedElementId === 'total_charge';
                          return (
                            <div 
                              onClick={() => setExpandedElementId('total_charge')}
                              className={`cursor-pointer transition-all duration-150 rounded ${
                                active ? 'ring-2 ring-rose-500 bg-rose-50/30 p-1' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350 p-0.5'
                              }`}
                              title="Klik untuk edit total biaya"
                            >
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              <div style={s.style} className={`space-y-1 text-slate-950 ${s.className}`}>
                                <div className="flex justify-between font-black">
                                  {s.showPrefix ? (
                                    <>
                                      <span>TOTAL BIAYA:</span>
                                      <span>Rp 59.000</span>
                                    </>
                                  ) : (
                                    <span className="w-full text-center block">Rp 59.000</span>
                                  )}
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-700">
                                  {s.showPrefix ? (
                                    <>
                                      <span>PAID STATE:</span>
                                      <span>LUNAS (Rp 0)</span>
                                    </>
                                  ) : (
                                    <span className="w-full text-center block">LUNAS (Rp 0)</span>
                                  )}
                                </div>
                                {settings.showPointsInReceipt && (() => {
                                  const pm = getElementStyle('member_points');
                                  if (!pm.isVisible) return null;
                                  const pmActive = expandedElementId === 'member_points';
                                  return (
                                    <div 
                                      style={pm.style} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedElementId('member_points');
                                      }}
                                      className={`flex justify-between font-bold cursor-pointer transition-all duration-150 rounded p-0.5 mt-1 ${pm.className} ${
                                        pmActive ? 'ring-2 ring-rose-500 bg-rose-50/30' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350'
                                      }`}
                                      title="Klik untuk rubah poin member"
                                    >
                                      {pm.showPrefix ? (
                                        <>
                                          <span>POIN MEMBER:</span>
                                          <span>+1 Poin (+1 Stamp)</span>
                                        </>
                                      ) : (
                                        <span className="w-full text-center block">+1 Poin (+1 Stamp)</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                {settings.showNotesInReceipt && (
                                  <div className="text-slate-650 italic text-[8.2px] mt-1 border-t border-slate-100 pt-1 text-left">
                                    Notes: "Wanginya dibanyakin ya kak, trims"
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Footer terms S&K Selesai */}
                        {(() => {
                          const s = getElementStyle('footer_terms');
                          if (!s.isVisible || !settings.showTermsInReceipt) return null;
                          const active = expandedElementId === 'footer_terms';
                          return (
                            <div 
                              onClick={() => setExpandedElementId('footer_terms')}
                              className={`cursor-pointer transition-all duration-150 rounded ${
                                active ? 'ring-2 ring-rose-500 bg-rose-50/30 p-1' : 'hover:bg-slate-100/80 hover:ring-1 hover:ring-rose-350 p-0.5'
                              }`}
                              title="Klik untuk edit syarat & ketentuan / catatan kaki"
                            >
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              <div style={s.style} className={`whitespace-pre-line leading-tight text-slate-700 ${s.className}`}>
                                {settings.customReceiptFooter || `* KETENTUAN OPERASIONAL *
1. Serahkan nota asli saat ambil pakaian.
2. Kerusakan/hilang diganti 5x lipat.
3. Komplain maksimal 1x24 jam pasca ambil.`}
                              </div>
                            </div>
                          );
                        })()}

                        {/* CUSTOM RECEIPT PROMOTIONAL FOOTER BLOCK */}
                        {settings.customReceiptPromo && (
                          <>
                            <div className="border-t border-dashed border-slate-400 my-2 pt-1.5">
                              <div className="text-center font-black text-[9px] text-rose-600 uppercase tracking-wide leading-tight bg-rose-50 p-1.5 rounded-lg border border-dashed border-rose-200">
                                📣 PROMO: {settings.customReceiptPromo}
                              </div>
                            </div>
                          </>
                        )}

                        {/* QRIS PAYMENT AUTOPRINT ON RECEIPT */}
                        {settings.qrisType && settings.qrisType !== 'none' && (
                          <div className="border-t border-dashed border-slate-400 my-2 pt-2 flex flex-col items-center animate-fade-in">
                            <span className="text-[7.5px] font-black text-slate-800 tracking-wider">
                              {settings.qrisType === 'static' ? 'SCAN QRIS STATIS' : 'SCAN QRIS DINAMIS'}
                            </span>
                            {settings.qrisMerchantId && (
                              <span className="text-[6px] text-slate-500 font-mono tracking-wider mb-1">
                                NMID: {settings.qrisMerchantId}
                              </span>
                            )}
                            
                            <div className="p-1 bg-white border border-slate-350 rounded flex flex-col items-center shadow-xs">
                              {settings.qrisType === 'static' && settings.qrisStaticQrUrl ? (
                                <img 
                                  src={settings.qrisStaticQrUrl} 
                                  alt="QRIS Static QR"
                                  className="w-16 h-16 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-900 bg-white p-0.5">
                                  <rect x="0" y="0" width="10" height="10" fill="currentColor" />
                                  <rect x="2" y="2" width="6" height="6" fill="white" />
                                  <rect x="3" y="3" width="4" height="4" fill="currentColor" />
                                  
                                  <rect x="90" y="0" width="10" height="10" fill="currentColor" />
                                  <rect x="92" y="2" width="6" height="6" fill="white" />
                                  <rect x="93" y="3" width="4" height="4" fill="currentColor" />
                                  
                                  <rect x="0" y="90" width="10" height="10" fill="currentColor" />
                                  <rect x="2" y="92" width="6" height="6" fill="white" />
                                  <rect x="3" y="93" width="4" height="4" fill="currentColor" />
                                  
                                  <rect x="20" y="5" width="15" height="4" fill="currentColor" />
                                  <text x="50" y="25" fill="currentColor" fontSize="8" fontWeight="bold" textAnchor="middle">QRIS</text>
                                  <rect x="15" y="15" width="4" height="20" fill="currentColor" />
                                  <rect x="40" y="30" width="25" height="5" fill="currentColor" />
                                  <rect x="75" y="12" width="8" height="30" fill="currentColor" />
                                  <rect x="22" y="45" width="12" height="12" fill="currentColor" />
                                  <rect x="50" y="40" width="10" height="25" fill="currentColor" />
                                  <rect x="10" y="65" width="25" height="6" fill="currentColor" />
                                  <rect x="45" y="70" width="30" height="8" fill="currentColor" />
                                  <rect x="80" y="60" width="12" height="12" fill="currentColor" />
                                  <rect x="15" y="80" width="15" height="5" fill="currentColor" />
                                  <rect x="90" y="45" width="6" height="20" fill="currentColor" />
                                  
                                  <rect x="42" y="42" width="16" height="16" fill="white" rx="1" />
                                  <text x="50" y="53" fill="#0c4a6e" fontSize="7" fontWeight="black" textAnchor="middle">Q</text>
                                </svg>
                              )}
                            </div>
                            
                            <span className="text-[5.5px] font-extrabold tracking-wider mt-1 text-[#0284c7] uppercase leading-none text-center">
                              {settings.qrisType === 'static' ? 'Merchant: LAUGHDRY EXPRESS' : 'API DYNAMIC VERIFIED'}
                            </span>
                          </div>
                        )}


                      </div>
                    );
                  })()}
                </div>

                {/* Simulated Feed and Status indicators */}
                <div className="w-full max-w-[215px] flex justify-between px-2 text-[9px] text-slate-400 font-bold mt-7">
                  <span>Paper Feed: 58mm POS</span>
                  <span className="text-emerald-500 animate-pulse flex items-center gap-1">● Online Ready</span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* WhatsApp Templates Editor */}
          {settingsInnerTab === 'wa' && (
          <div className="space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 animate-bounce" />
                Template Isi Otomatis Notifikasi WhatsApp (CRM Automation)
              </h4>
              <span className="text-[10px] bg-slate-100 font-semibold px-2 py-0.5 rounded text-slate-500">Auto Variable Binder Ready</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-700">{tmpl.name}</span>
                      <span className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">{tmpl.category}</span>
                    </div>
                    <textarea
                      rows={11}
                      defaultValue={tmpl.body}
                      onBlur={(e) => handleTemplateChange(tmpl.id, e.target.value)}
                      placeholder="Masukkan format pesan..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] font-mono leading-relaxed text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                    💡 Simpan dengan <strong>klik di luar kotak (blur target)</strong> untuk memperbarui template.
                  </div>
                </div>
              ))}
            </div>

            {/* Panduan Variabel String */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-150 space-y-2 text-xs mt-6 animate-scaleIn">
              <h4 className="font-extrabold text-emerald-800 flex items-center gap-1.5 text-xs uppercase">
                <span>ℹ️ Panduan Variabel Transaksi WhatsApp</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  '{{customer_name}}',
                  '{{invoice_number}}',
                  '{{services_list}}',
                  '{{total_quantity}}',
                  '{{total_amount}}',
                  '{{payment_method}}',
                  '{{payment_status}}',
                  '{{estimated_completion}}',
                  '{{branch_name}}',
                  '{{branch_address}}',
                  '{{tracking_url}}',
                  '{{perfume}}'
                ].map(v => (
                  <span key={v} className="px-2 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg font-mono text-[10.5px] font-bold shadow-2xs">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Physical Receipt Live Preview Modal popup */}
          {showReceiptPreviewPopup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-slate-100 rounded-3xl p-5 w-full max-w-sm shadow-2xl relative font-sans max-h-[90vh] overflow-y-auto flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 mb-4 text-xs font-sans">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    🖨️ Hasil Cetak Struk Fisik (58mm)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowReceiptPreviewPopup(false)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition text-xs font-bold cursor-pointer"
                  >
                    Tutup ✕
                  </button>
                </div>

                {/* Simulated printer feeder slot */}
                <div className="w-full max-w-[215px] bg-slate-800 h-5 rounded-t-xl shadow-md border border-slate-700 relative flex items-center justify-center">
                  <div className="w-[85%] h-1 bg-black rounded-full shadow-inner"></div>
                </div>

                {/* Realistic Thermal Receipt Roll Mockout */}
                <div className="bg-white text-slate-950 font-mono p-4 w-full max-w-[215px] border-x border-b border-slate-300 shadow-xl relative select-all select-none" style={{
                  backgroundImage: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #fafafa 100%)'
                }}>
                  {/* Decorative receipt tear zig-zag bottom */}
                  <div className="absolute -bottom-1.5 inset-x-0 h-1.5 overflow-hidden flex">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 bg-white border-b border-r border-slate-200 rotate-45 transform origin-top shrink-0 -mt-1.25 shadow-xs"></div>
                    ))}
                  </div>

                  {(() => {
                    const getElementStyle = (elementId: string) => {
                      const defaultStyles: {[key: string]: { fontSize: number, alignment: 'left' | 'center' | 'right', isBold: boolean, isVisible: boolean, showPrefix?: boolean, isItalic?: boolean }} = {
                        outlet_name: { fontSize: 13, alignment: 'center', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        invoice_number: { fontSize: 11, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        customer_name: { fontSize: 13, alignment: 'left', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        customer_phone: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        order_date: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        cashier_info: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        order_status: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        estimated_time: { fontSize: 9, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        perfume_fragrance: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        item_list: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        total_charge: { fontSize: 12, alignment: 'right', isBold: true, isVisible: true, showPrefix: true, isItalic: false },
                        member_points: { fontSize: 10, alignment: 'left', isBold: false, isVisible: true, showPrefix: true, isItalic: false },
                        footer_terms: { fontSize: 9, alignment: 'center', isBold: false, isVisible: true, showPrefix: true, isItalic: false }
                      };

                      const config = (settings.receiptElements || []).find((el: any) => el.id === elementId) || defaultStyles[elementId] || defaultStyles.invoice_number;
                      const alignClass = config.alignment === 'center' ? 'text-center' : config.alignment === 'right' ? 'text-right' : 'text-left';
                      const weightClass = config.isBold ? 'font-black' : 'font-semibold';
                      const italicClass = config.isItalic ? 'italic' : '';
                      
                      return {
                        style: {
                          fontSize: `${config.fontSize || 10}px`,
                        },
                        className: `${alignClass} ${weightClass} ${italicClass}`,
                        isVisible: config.isVisible !== false,
                        showPrefix: config.showPrefix !== false
                      };
                    };

                    return (
                      <div className="space-y-1 science-receipt-text w-full">
                        {/* Header logo */}
                        {settings.showHeaderLogoInReceipt && settings.customReceiptHeaderLogoImg && (
                          <div className="flex justify-center mb-2 text-center">
                            <img 
                              src={settings.customReceiptHeaderLogoImg} 
                              alt="Receipt Header Logo" 
                              className="w-14 h-14 object-contain rounded border border-slate-200 p-0.5 bg-white bg-opacity-90"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Outlet name */}
                        {(() => {
                          const s = getElementStyle('outlet_name');
                          if (!s.isVisible) return null;
                          return (
                            <div style={s.style} className={`uppercase tracking-tight whitespace-pre-line mb-1.5 leading-tight p-1 rounded ${s.className}`}>
                              {settings.customReceiptHeader || 'LAUGHDRY EXPRESS'}
                            </div>
                          );
                        })()}

                        {settings.showBranchPhone && (
                          <div className="font-bold text-slate-700 text-center text-[8px] mb-1">
                            TELP BRANCH: 0812-3456-7890
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-400 my-2"></div>

                        {/* Invoice & order meta information */}
                        <div className="space-y-0.5 text-slate-850">
                          {(() => {
                            const s = getElementStyle('invoice_number');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-1 rounded ${s.className}`}>
                                {s.showPrefix && 'Nbr: '}LD-10023-A
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('customer_name');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-1 rounded uppercase ${s.className}`}>
                                {s.showPrefix && 'Cust: '}Budiman Pratama
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('customer_phone');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded ${s.className}`}>
                                {s.showPrefix && 'Tel: '}0812-9876-5432
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('order_date');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded ${s.className}`}>
                                {s.showPrefix && 'Date: '}09/06/2026 14:15
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('cashier_info');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded uppercase ${s.className}`}>
                                {s.showPrefix && 'Opr: '}Andi Wijaya
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('order_status');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded ${s.className}`}>
                                {s.showPrefix && 'Pay: '}LUNAS (Cash - Rp50.000)
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('estimated_time');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded ${s.className}`}>
                                {s.showPrefix && 'Est: '}11/06/2026 14:15
                              </div>
                            );
                          })()}

                          {(() => {
                            const s = getElementStyle('perfume_fragrance');
                            if (!s.isVisible) return null;
                            return (
                              <div style={s.style} className={`leading-tight p-0.5 rounded ${s.className}`}>
                                {s.showPrefix && 'Parfum: '}Downy Red Sweet
                              </div>
                            );
                          })()}
                        </div>

                        <div className="border-t border-dashed border-slate-400 my-2"></div>

                        {/* Item list */}
                        {(() => {
                          const s = getElementStyle('item_list');
                          if (!s.isVisible) return null;
                          return (
                            <div style={s.style} className={`p-1 rounded ${s.className}`}>
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>Cucian Kiloan (Reguler)</span>
                                <span>5 kg</span>
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-500">
                                <span>@ Rp10.000 / kg</span>
                                <span>Rp50.000</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="border-t border-dashed border-slate-400 my-2"></div>

                        {/* Total charge */}
                        {(() => {
                          const s = getElementStyle('total_charge');
                          if (!s.isVisible) return null;
                          return (
                            <div style={s.style} className={`p-1 rounded pr-2 text-slate-900 ${s.className}`}>
                              {s.showPrefix && 'TOTAL TAGIHAN: '}Rp50.000
                            </div>
                          );
                        })()}

                        {/* Member points */}
                        {(() => {
                          const s = getElementStyle('member_points');
                          if (!s.isVisible) return null;
                          return (
                            <div style={s.style} className={`p-0.5 rounded text-amber-800 ${s.className}`}>
                              {s.showPrefix && 'Loyalty Points: '}+5 Poin (Total: 45 Poin)
                            </div>
                          );
                        })()}

                        <div className="border-t border-dashed border-slate-400 my-2"></div>

                        {/* Footer S&K */}
                        {(() => {
                          const s = getElementStyle('footer_terms');
                          if (!s.isVisible) return null;
                          return (
                            <div style={s.style} className={`text-slate-700 whitespace-pre-line leading-tight p-1 rounded ${s.className}`}>
                              {settings.customReceiptFooter || 'Terima kasih telah mencuci di LaughDry!\nHarap bawa nota ini saat pengambilan pakaian.'}
                            </div>
                          );
                        })()}

                        {/* Custom promos */}
                        {settings.customReceiptPromo && (
                          <div className="border-t border-dashed border-slate-400 my-2 pt-1.5">
                            <div className="text-center font-black text-[9px] text-rose-600 uppercase tracking-wide leading-tight bg-rose-50 p-1.5 rounded-lg border border-dashed border-rose-200">
                              📣 PROMO: {settings.customReceiptPromo}
                            </div>
                          </div>
                        )}

                        {/* QRIS section */}
                        {settings.qrisType && settings.qrisType !== 'none' && (
                          <div className="border-t border-dashed border-slate-400 my-2 pt-2 flex flex-col items-center">
                            <span className="text-[7.5px] font-black text-slate-800 tracking-wider">
                              {settings.qrisType === 'static' ? 'SCAN QRIS STATIS' : 'SCAN QRIS DINAMIS'}
                            </span>
                            {settings.qrisMerchantId && (
                              <span className="text-[6px] text-slate-500 font-mono tracking-wider mb-1 font-bold">
                                NMID: {settings.qrisMerchantId}
                              </span>
                            )}
                            <div className="p-1 bg-white border border-slate-300 rounded flex flex-col items-center">
                              {settings.qrisType === 'static' && settings.qrisStaticQrUrl ? (
                                <img src={settings.qrisStaticQrUrl} alt="QRIS Static QR" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-900 bg-white p-0.5">
                                  <rect x="0" y="0" width="10" height="10" fill="currentColor" />
                                  <rect x="2" y="2" width="6" height="6" fill="white" />
                                  <rect x="3" y="3" width="4" height="4" fill="currentColor" />
                                  
                                  <rect x="90" y="0" width="10" height="10" fill="currentColor" />
                                  <rect x="92" y="2" width="6" height="6" fill="white" />
                                  <rect x="93" y="3" width="4" height="4" fill="currentColor" />
                                  
                                  <rect x="0" y="90" width="10" height="10" fill="currentColor" />
                                  <rect x="2" y="92" width="6" height="6" fill="white" />
                                  <rect x="3" y="93" width="4" height="4" fill="currentColor" />
                                  
                                  <text x="50" y="25" fill="currentColor" fontSize="8" fontWeight="bold" textAnchor="middle">QRIS</text>
                                  <circle cx="50" cy="50" r="10" fill="currentColor" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="w-full flex justify-center text-[10px] text-slate-500 font-bold mt-7">
                  <span>Paper Feed: 58mm POS • Online Ready</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReceiptPreviewPopup(false)}
                  className="mt-6 p-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition w-full text-center"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    )}

      {/* 6. CASHIER SETUP MANAGEMENT ACCORDION */}
      {activeSubTab === 'cashiers' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4" id="section-cashiers">
          <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150">
            <div className="flex items-center gap-2">
              <span className="text-sm">👥</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Atur Akun Kasir</span>
            </div>
          </div>
          <div className="p-4 space-y-6 animate-fadeIn" id="cashier-setup-panel">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500 animate-pulse" />
                Sistim Pengaturan & Pembagian Akun Kasir (Karyawan POS)
              </h3>
              <p className="text-[11px] text-slate-500">Mendaftarkan kasir baru, menetapkan password, serta alokasi cabang penugasan shift harian.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {!showEditOwner && (
                <button
                  onClick={() => {
                    const owner = users.find(u => u.role === 'owner') || { name: 'Andi Owner', username: 'owner', password: 'owner' };
                    setOwnerForm({
                      name: owner.name,
                      username: owner.username,
                      password: owner.password || 'owner'
                    });
                    setShowEditOwner(true);
                    setShowAddCashier(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-sky-400 hover:text-sky-300 font-bold rounded-lg text-[10.5px] transition shadow-2xs cursor-pointer"
                  id="btn-edit-owner-profile"
                >
                  ⚙️ Atur Profil Owner
                </button>
              )}
              {!showAddCashier && (
                <button
                  onClick={() => {
                    setEditingCashierId(null);
                    setCashierForm({ name: '', username: '', password: '', branchId: 'br-1' });
                    setShowAddCashier(true);
                    setShowEditOwner(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg text-[10.5px] transition shadow-2xs cursor-pointer"
                  id="btn-add-cashier"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Akun Kasir
                </button>
              )}
            </div>
          </div>

          {showEditOwner && (
            <form onSubmit={handleSaveOwner} className="bg-slate-950 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-xs font-sans animate-scaleIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
                  <span>⚙️ Pengaturan Profil & Kredensial Database Owner</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowEditOwner(false)}
                  className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] rounded transition"
                >
                  ✕ Batal
                </button>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Ubah informasi profil owner utama yang terdaftar dalam database pengguna. Perubahan nama akan otomatis menyesuaikan semua label izin/hak akses, riwayat aktivitas, serta otorisasi di seluruh modul kasir laundry.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Nama Lengkap Owner:</label>
                  <input
                    type="text"
                    required
                    value={ownerForm.name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                    placeholder="Contoh: Andi Owner"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Username Login:</label>
                  <input
                    type="text"
                    required
                    value={ownerForm.username}
                    onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="owner"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Password Akun:</label>
                  <input
                    type="password"
                    required
                    value={ownerForm.password}
                    onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                    placeholder="Password Owner"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 focus:border-sky-500 focus:outline-none animate-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditOwner(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-400 hover:bg-sky-500 text-slate-950 font-extrabold rounded-xl transition"
                >
                  Simpan Profil Owner
                </button>
              </div>
            </form>
          )}

          {showAddCashier && (
            <form onSubmit={handleSaveCashier} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs font-sans">
              <h4 className="font-bold text-slate-800 text-sm">{editingCashierId ? '✏️ Ubah Detail Akun Kasir' : '👥 Registrasi Akun Kasir Baru'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block">Nama Lengkap:</label>
                  <input
                    type="text"
                    required
                    value={cashierForm.name}
                    onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                    placeholder="Contoh: Rian Karyawan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block">Username Login:</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCashierId}
                    value={cashierForm.username}
                    onChange={(e) => setCashierForm({ ...cashierForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="rian"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block">Password:</label>
                  <input
                    type="password"
                    required
                    value={cashierForm.password}
                    onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })}
                    placeholder="Min 4 karakter"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block">Cabang Kelolaan:</label>
                  <select
                    value={cashierForm.branchId}
                    onChange={(e) => setCashierForm({ ...cashierForm, branchId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:outline-none font-semibold text-slate-700"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCashier(false);
                    setEditingCashierId(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-extrabold rounded-xl"
                >
                  {editingCashierId ? 'Simpan Perubahan' : 'Daftarkan Kasir'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500 text-[10px]">
              Daftar Kasir & Cabang Yang Dikelola
            </div>

            <div className="divide-y divide-slate-100 font-sans">
              {users.filter(u => u.role === 'karyawan').map(u => {
                const br = branches.find(b => b.id === u.branchId);
                return (
                  <div key={u.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[9px] font-extrabold uppercase">KASIR</span>
                        <strong className="text-slate-800 text-sm">{u.name}</strong>
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        Username: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{u.username}</span> &middot; Password: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{u.password || '●●●●●●'}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] space-y-0.5 mt-1">
                        <div>🏢 Bekerja di: <strong className="text-slate-700">{br ? br.name : 'Cabang Utama'}</strong></div>
                        <div>🔑 Hak Akses: <strong className="text-indigo-600 font-extrabold">{getOwnerName()}</strong></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEditCashier(u)}
                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (u.id === 'usr-1') {
                            alert("Tidak dapat menghapus akun owner!");
                          } else {
                            setDeleteConfirmCashier(u);
                          }
                        }}
                        className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 7. BRANCH DATABASE MANAGEMENT ACCORDION */}
      {activeSubTab === 'branches' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4" id="section-branches">
          <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏢</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Kelola Cabang</span>
            </div>
          </div>
          <div className="p-4 space-y-6 animate-fadeIn" id="branch-setup-panel">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-sky-500 animate-pulse" />
                Sistem Database & Pengaturan Multi-Outlet Cabang Laundry
              </h3>
              <p className="text-[11px] text-slate-500">Mendaftarkan cabang outlet baru, memposisikan titik alamat fisik, serta merincikan nomor kontak operasional.</p>
            </div>
            {!showAddBranch && (
              <button
                onClick={() => {
                  setEditingBranchId(null);
                  setBranchForm({ name: '', address: '', phone: '' });
                  setShowAddBranch(true);
                }}
                className="px-4 py-2 bg-slate-950 text-sky-400 border border-slate-800 hover:bg-slate-900 hover:text-sky-300 font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
                id="btn-add-branch-tab"
              >
                <Plus className="w-4 h-4" /> Tambah Cabang Baru
              </button>
            )}
          </div>

          {/* ADD / EDIT BRANCH PANEL */}
          {showAddBranch && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 animate-scaleIn font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {editingBranchId ? 'Formulir Sunting Cabang Laundry' : 'Formulir Pendaftaran Cabang Baru'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddBranch(false);
                    setEditingBranchId(null);
                  }}
                  className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-550 text-[10.5px] rounded-lg transition"
                >
                  ✕ Batal
                </button>
              </div>

              <form onSubmit={handleSaveBranch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block" htmlFor="branch-name-input">
                      Nama Cabang/Outlet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="branch-name-input"
                      required
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="Contoh: Cabang Pondok Indah, Cabang Fatmawati"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block" htmlFor="branch-phone-input">
                      Nomor Telepon Hubungi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="branch-phone-input"
                      required
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      placeholder="Contoh: 081299887766 atau (021) 7654321"
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block" htmlFor="branch-address-input">
                    Alamat Lengkap Outlet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="branch-address-input"
                    required
                    rows={3}
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    placeholder="Contoh: Ruko Golden Boulevard Blok C No. 10, Jl. Pahlawan Seribu, BSD City, Tangerang Selatan"
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 transition resize-none"
                  />
                </div>

                <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 space-y-3 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1">
                      📍 Konfigurasi GPS Cabang (Geofencing Presensi)
                    </span>
                    <button
                      type="button"
                      onClick={detectBranchGPS}
                      className="px-3 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      📡 Deteksi GPS Saat Ini
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-extrabold text-slate-500 block">Latitude (Lintang)</label>
                      <input
                        type="text"
                        placeholder="Contoh: -6.2730"
                        value={branchForm.latitude}
                        onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none text-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-extrabold text-slate-500 block">Longitude (Bujur)</label>
                      <input
                        type="text"
                        placeholder="Contoh: 106.7260"
                        value={branchForm.longitude}
                        onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none text-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Preset coordinates for quick select if GPS sensor is offline/blocked on HP */}
                  <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-150">
                    <span className="text-[8.5px] text-slate-400 font-extrabold w-full mb-0.5">PILIHAN PRESET CEPAT KOORDINAT (HP):</span>
                    {[
                      { name: 'Bintaro S9', lat: -6.2730, lng: 106.7260 },
                      { name: 'Jakarta Sel', lat: -6.2240, lng: 106.8000 },
                      { name: 'Tangerang', lat: -6.1783, lng: 106.6300 },
                      { name: 'Bekasi', lat: -6.2383, lng: 106.9756 },
                      { name: 'Bandung', lat: -6.9175, lng: 107.6191 },
                      { name: 'Surabaya', lat: -7.2575, lng: 112.7521 }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setBranchForm(prev => ({
                            ...prev,
                            latitude: preset.lat.toFixed(6),
                            longitude: preset.lng.toFixed(6)
                          }));
                          triggerToast(`📍 Set preset Cabang: ${preset.name}`);
                        }}
                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black rounded-lg transition"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">
                    *Koordinat ini digunakan untuk memastikan kasir melakukan presensi masuk & keluar dekat dari lokasi outlet fisik.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBranch(false);
                      setEditingBranchId(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-605 text-slate-950 font-black rounded-xl text-xs transition shadow-sm"
                  >
                    {editingBranchId ? 'Simpan Perubahan' : 'Daftarkan Cabang'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BRANCH LIST GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map(b => {
              const assignedCashiers = users.filter(u => u.branchId === b.id && u.role === 'karyawan');
              const totalBranchOrders = orders.filter(o => o.branchId === b.id).length;
              return (
                <div key={b.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4 hover:shadow-md transition leading-relaxed relative overflow-hidden flex flex-col justify-between">
                  {/* Visual accent top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-400"></div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider text-[9px]">OUTLET / CABANG</h4>
                        <span className="font-bold text-slate-800 text-sm block mt-0.5">{b.name}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] font-bold rounded">
                        ID: {b.id}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{b.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-600">{b.phone}</span>
                      </div>
                      {b.latitude && b.longitude ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/85 px-2.5 py-1 rounded-xl border border-emerald-150 max-w-max text-[9.5px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Geofence GPS: {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-xl border border-amber-150 max-w-max text-[9.5px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-450"></span>
                          <span>GPS Tanpa Geofencing</span>
                        </div>
                      )}
                    </div>

                    {/* Stats counters */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-50">
                      <div className="text-center md:text-left">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Staf Kasir</span>
                        <div className="flex items-center justify-center md:justify-start gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-sky-400" />
                          <strong className="text-slate-800 text-xs font-mono">{assignedCashiers.length} Orang</strong>
                        </div>
                      </div>
                      <div className="text-center md:text-left border-l border-slate-150 pl-3">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Riwayat Nota</span>
                        <div className="flex items-center justify-center md:justify-start gap-1 mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <strong className="text-slate-800 text-xs font-mono">{totalBranchOrders} Order</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50 mt-auto">
                    <button
                      onClick={() => startEditBranch(b)}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (branches.length <= 1) {
                          alert("Tidak dapat menghapus cabang terakhir Anda! Harus ada minimal 1 cabang laundry aktif.");
                        } else {
                          setDeleteConfirmBranch(b);
                        }
                      }}
                      className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

      {/* 8. REKAP PRESENSI & JAM KERJA KARYAWAN ACCORDION */}
      {activeSubTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-4" id="section-attendance">
          <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left border-b border-slate-150">
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Rekap Absensi Karyawan</span>
            </div>
          </div>
          <div className="p-4 space-y-6 animate-fadeIn font-sans">
          {/* Header & Reload */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-850 flex items-center gap-2">
                <span className="p-1 px-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">📅</span>
                Rekap Presensi & Jam Kerja Karyawan
              </h2>
              <p className="text-xs text-slate-450 mt-0.5">Pantau kesiapan staf outlet, durasi shift kerja, koordinat presensi, dan rekapitulasi harian.</p>
            </div>
            <button
              onClick={() => {
                const records = LaughDryDatabase.getAttendance();
                setAttendanceRecords(records);
                triggerToast("🔄 Data Absensi Karyawan Diperbarui!");
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95"
            >
              🔄 Refresh Data
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Branch Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase">Saring Cabang Outlet</label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setAttendanceStaffFilter('all'); // reset staff filter when branch changes
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="all">Semua Cabang (Seluruh Outlet)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Staff Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase">Nama Karyawan / Kasir</label>
              <select
                value={attendanceStaffFilter}
                onChange={(e) => setAttendanceStaffFilter(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="all">Semua Kasir</option>
                {users
                  .filter(u => u.role === 'karyawan' && (selectedBranch === 'all' || u.branchId === selectedBranch))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))
                }
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase">Status Kehadiran Sesi</label>
              <select
                value={attendanceStatusFilter}
                onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="all">Semua Status</option>
                <option value="Hadir">Aktif Bekerja (Check-In)</option>
                <option value="Selesai">Sudah Checkout (Selesai)</option>
                <option value="Ditolak">Presensi Ditolak (Luar Geofence)</option>
              </select>
            </div>
          </div>

          {/* Metrics Summary Row */}
          {(() => {
            // Apply filtering logic
            const filteredRecords = attendanceRecords.filter(r => {
              const matchesBranch = selectedBranch === 'all' || r.branchId === selectedBranch;
              const matchesStaff = attendanceStaffFilter === 'all' || r.userId === attendanceStaffFilter;
              const matchesStatus = attendanceStatusFilter === 'all' || r.status === attendanceStatusFilter;
              return matchesBranch && matchesStaff && matchesStatus;
            });

            const activeWorkingCount = filteredRecords.filter(r => r.status === 'Hadir').length;
            const completedShiftsCount = filteredRecords.filter(r => r.status === 'Selesai').length;
            const rejectedAttemptsCount = filteredRecords.filter(r => r.status === 'Ditolak').length;
            
            const totalMinutesWorked = filteredRecords
              .filter(r => r.status === 'Selesai')
              .reduce((sum, r) => sum + (r.workDuration || 0), 0);
            
            const totalHours = Math.floor(totalMinutesWorked / 60);
            const totalRemainingMinutes = totalMinutesWorked % 60;

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Metric 1 */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">staf aktif bekerja</span>
                      <div className="text-2xl font-black text-slate-800 mt-1">{activeWorkingCount} Orang</div>
                      <p className="text-[10.5px] text-slate-400 mt-1">Staf outlet yang saat ini sedang berada di shift aktif.</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl animate-pulse">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">shif selesai</span>
                      <div className="text-2xl font-black text-slate-800 mt-1">{completedShiftsCount} Sesi</div>
                      <p className="text-[10.5px] text-slate-400 mt-1">Sesi kerja harian karyawan yang telah selesai checkout.</p>
                    </div>
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">total akumulasi durasi</span>
                      <div className="text-2xl font-black text-slate-800 mt-1">
                        {totalHours}j {totalRemainingMinutes}m
                      </div>
                      <p className="text-[10.5px] text-slate-400 mt-1">Jumlah jam kerja produktif terakumulasi dari seluruh staf.</p>
                    </div>
                    <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">upaya ditolak</span>
                      <div className="text-2xl font-black text-rose-600 mt-1">{rejectedAttemptsCount} Kali</div>
                      <p className="text-[10.5px] text-slate-400 mt-1">Upaya absensi di luar geofence / sinyal GPS terlalu lemah.</p>
                    </div>
                    <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Table of Attendance Records */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Tabel Log Absensi</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 select-none text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="p-4 pl-6">Nama Kasir</th>
                          <th className="p-4">Cabang Outlet</th>
                          <th className="p-4">Jam Check-In</th>
                          <th className="p-4">Jam Check-Out</th>
                          <th className="p-4">Durasi Shift</th>
                          <th className="p-4">Catatan Operasional</th>
                          <th className="p-4 pr-6 text-right">Lokasi GPS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              Tidak ada log kehadiran karyawan yang cocok dengan kriteria saringan di atas.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((r, idx) => {
                            const branchName = branches.find(b => b.id === r.branchId)?.name || 'Cabang Utama';
                            let checkInStr = '⏳--';
                            try { if (r.checkIn) checkInStr = new Date(r.checkIn).toLocaleString('id-ID') + ' WIB'; } catch(e) {}
                            let checkOutStr = '⏳--';
                            try { if (r.checkOut) checkOutStr = new Date(r.checkOut).toLocaleString('id-ID') + ' WIB'; } catch(e) {}
                            
                             return (
                              <tr key={r.id || idx} className="hover:bg-slate-50/50 transition border-b border-slate-50">
                                <td className="p-4 pl-6">
                                  <div className="flex items-center gap-2.5">
                                    {r.photoUrl ? (
                                      <img src={r.photoUrl} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-slate-105 flex items-center justify-center font-bold text-[11px] text-slate-600 border border-slate-200 shrink-0">
                                        {r.userName?.charAt(0) || 'K'}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-extrabold text-slate-800 block leading-tight">{r.userName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono leading-none block mt-1">ID: {r.userId}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 font-semibold text-slate-600">
                                  {branchName}
                                </td>
                                <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                                  {checkInStr}
                                </td>
                                <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                                  {r.status === 'Ditolak' ? (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold rounded-lg inline-block">
                                      🚫 Kunjungan Ditolak
                                    </span>
                                  ) : r.status === 'Hadir' ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold rounded-lg animate-pulse inline-block">
                                      Sedang Berjalan
                                    </span>
                                  ) : (
                                    checkOutStr
                                  )}
                                </td>
                                <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                                  {r.status === 'Ditolak' ? '🚫 Batal (Ditolak)' : r.status === 'Hadir' ? '⏳ Aktif' : `${Math.floor((r.workDuration || 0) / 60)}j ${(r.workDuration || 0) % 60}m`}
                                </td>
                                <td className="p-4 max-w-sm text-slate-600">
                                  {r.status === 'Ditolak' ? (
                                    <div className="bg-rose-50/70 p-2.5 rounded-xl text-[10px] pr-3 border border-rose-100 text-rose-800 font-medium">
                                      ⚠️ <strong className="font-extrabold uppercase text-[9px] text-rose-900 block pb-0.5">Percobaan Di Luar Jangkauan:</strong>
                                      {r.notes || 'Staf terdeteksi berada di luar jangkauan radius 2 KM cabang.'}
                                    </div>
                                  ) : (
                                    <>
                                      {r.notes && <div className="leading-snug text-[10.5px] text-slate-500 italic pb-1.5 font-medium">💌 {r.notes}</div>}
                                      {(r.startingCashDrawer !== undefined || r.endingCashDrawerInput !== undefined) ? (
                                        <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] font-mono leading-normal text-slate-650 space-y-0.5 border border-slate-100 pr-3">
                                          {r.startingCashDrawer !== undefined && (
                                            <div>• Saldo Kas Awal: <strong className="text-slate-800">Rp {r.startingCashDrawer.toLocaleString('id-ID')}</strong></div>
                                          )}
                                          {r.endingCashDrawerInput !== undefined && (
                                            <div>• Fisik Laci Keluar: <strong className="text-slate-800">Rp {r.endingCashDrawerInput.toLocaleString('id-ID')}</strong></div>
                                          )}
                                          {r.expectedCashBalance !== undefined && (
                                            <div>• Kas Hitung Buku: <strong className="text-slate-800 font-bold">Rp {r.expectedCashBalance.toLocaleString('id-ID')}</strong></div>
                                          )}
                                          {r.cashDifference !== undefined && (
                                            <div className="pt-0.5 mt-1 border-t border-slate-200/50 flex justify-between">
                                              <span>STATUS REKONSILIASI:</span>
                                              <strong className={r.cashDifference === 0 ? "text-emerald-600 font-extrabold bg-emerald-50 px-1 rounded" : "text-rose-600 font-extrabold bg-rose-50 px-1 rounded animate-pulse"}>
                                                {r.cashDifference === 0 ? "✓ COCOK (Rp 0)" : `Rp ${r.cashDifference.toLocaleString('id-ID')}`}
                                              </strong>
                                            </div>
                                          )}
                                          {r.reconciliationNotes && (
                                            <div className="text-[10px] text-rose-600 italic font-sans leading-snug pt-1 font-bold">
                                              ⚠️ Alasan Selisih: {r.reconciliationNotes}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 font-sans font-semibold text-[10px] italic">- (Shift lama)</span>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="p-4 pr-6 text-right font-mono text-[10.5px] whitespace-nowrap">
                                  {r.latLong ? (
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${r.latLong}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 hover:underline text-indigo-600 font-bold bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 transition-all text-[9.5px]"
                                      title="Klik untuk verifikasi posisi di Google Maps"
                                    >
                                      <span>📍 {r.latLong}</span>
                                      <span className="text-[8.5px] font-sans font-black bg-indigo-600 text-white px-1 py-0.25 rounded">MAP ➔</span>
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* TODAY TRANSACTIONS MODAL */}
      {showTodayTransactionsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn font-sans">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Rincian Transaksi Hari Ini
                </h3>
              </div>
              <button
                onClick={() => setShowTodayTransactionsModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Total Revenue Summary Bar */}
            <div className="p-4 bg-emerald-50 text-emerald-800 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span>Total Omzet Lunas Terhitung:</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  Rp {filteredOrders
                    .filter(o => (o.paymentDate || o.createdAt).startsWith(activeTodayStr) && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN)
                    .reduce((acc, o) => acc + o.totalAmount, 0)
                    .toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {filteredOrders.filter(o => o.createdAt.startsWith(activeTodayStr) && o.paymentStatus === 'Lunas').length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  Tidak ada transaksi lunas yang tercatat hari ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-2">
                        <th className="pb-3 text-left">No Nota</th>
                        <th className="pb-3 text-left">Nama Pelanggan</th>
                        <th className="pb-3 text-left">Layanan Laundry</th>
                        <th className="pb-3 text-center">Status Cucian</th>
                        <th className="pb-3 text-center">Bayar</th>
                        <th className="pb-3 text-right">Biaya Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredOrders
                        .filter(o => o.createdAt.startsWith(activeTodayStr) && o.paymentStatus === 'Lunas')
                        .map(order => {
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/60 transition duration-150">
                              <td className="py-3 font-mono font-bold text-slate-900">{order.invoiceNumber}</td>
                              <td className="py-3 font-medium">
                                <div>{order.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</div>
                              </td>
                              <td className="py-3">
                                <div className="max-w-[200px] truncate" title={order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}>
                                  {order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700">
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${order.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600 border border-rose-150'}`}>
                                  {order.paymentStatus === 'Lunas' ? 'Lunas' : 'Piutang'}
                                </span>
                                <span className="text-[10px] block text-slate-400 mt-0.5">{order.paymentMethod}</span>
                              </td>
                              <td className="py-3 text-right font-bold text-slate-850">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={handleDownloadTodayPDF}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-550 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Unduh PDF Harian
              </button>
              <button
                onClick={() => setShowTodayTransactionsModal(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer active:scale-95"
              >
                Tutup Ringkasan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MONTHLY REVENUE DETAILS MODAL */}
      {showMonthlyRevenueDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn font-sans text-slate-800">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Log Detail Transaksi Transparan ({monthlyReportStartDate} s.d {monthlyReportEndDate})
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Menampilkan seluruh transaksi lunas & piutang pada jangka waktu terfilter.</p>
              </div>
              <button
                onClick={() => setShowMonthlyRevenueDetail(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Stats Summary Bar */}
            <div className="p-4 bg-emerald-50 text-emerald-800 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-4">
                <div>
                  <span>Total Omzet Lunas Terhitung:</span>
                  <strong className="text-emerald-700 font-mono text-sm ml-1.5">
                    Rp {monthlyTransactions
                      .filter(o => o.paymentStatus === 'Lunas')
                      .reduce((acc, o) => acc + o.totalAmount, 0)
                      .toLocaleString('id-ID')}
                  </strong>
                </div>
                <div className="h-4 w-px bg-emerald-250"></div>
                <div>
                  <span>Volume Transaksi:</span>
                  <strong className="text-indigo-700 font-mono text-sm ml-1.5">
                    {monthlyTransactions.length} Order
                  </strong>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadLunasPDFReport(monthlyReportStartDate, monthlyReportEndDate)}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-550 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  📄 Cetak Laba Rugi (.pdf)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLunasSummaryReport(monthlyReportStartDate, monthlyReportEndDate)}
                  className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  📊 Ringkasan Omzet (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleExportMonthlyExcel}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                >
                  📥 Ekspor Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handlePrintMonthlyReport}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                >
                  🖨️ Cetak Struk Fisik
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
              {monthlyTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  Tidak ada transaksi yang tercatat dalam rentang tanggal terpilih.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-2">
                        <th className="pb-3 text-left">No Nota</th>
                        <th className="pb-3 text-left">Tanggal</th>
                        <th className="pb-3 text-left">Nama Pelanggan</th>
                        <th className="pb-3 text-left">Layanan Laundry</th>
                        <th className="pb-3 text-center">Status Cucian</th>
                        <th className="pb-3 text-center">Bayar</th>
                        <th className="pb-3 text-right">Biaya Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {monthlyTransactions.map(order => {
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/60 transition duration-150">
                            <td className="py-3 font-mono font-bold text-slate-900">{order.invoiceNumber}</td>
                            <td className="py-3 text-slate-500 font-mono text-[10px]">
                              {new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 font-medium">
                              <div>{order.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</div>
                            </td>
                            <td className="py-3">
                              <div className="max-w-[200px] truncate" title={order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}>
                                {order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700">
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${order.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600 border border-rose-150'}`}>
                                {order.paymentStatus === 'Lunas' ? 'Lunas' : 'Piutang'}
                              </span>
                              <span className="text-[10px] block text-slate-400 mt-0.5">{order.paymentMethod}</span>
                            </td>
                            <td className="py-3 text-right font-bold text-slate-850">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowMonthlyRevenueDetail(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Log
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CASHIER DETAIL & WORK PRODUCTIVITIES MODAL */}
      {selectedActiveCashier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-800">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn font-sans">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedActiveCashier.avatar} 
                  alt={selectedActiveCashier.name} 
                  className="w-10 h-10 rounded-full border-2 border-indigo-400 bg-slate-800" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Staff Performance</h3>
                  <h2 className="text-sm font-extrabold text-white leading-normal">{selectedActiveCashier.name}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedActiveCashier(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white transition cursor-pointer text-xs font-bold"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Date Pickers Filter Bar */}
            <div className="p-4 bg-indigo-50/70 border-b border-indigo-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <span className="font-extrabold text-slate-705 block">Jangka Waktu Analisa:</span>
              
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-indigo-150 w-full sm:w-auto justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black text-slate-400">DARI:</span>
                  <input
                    type="date"
                    value={cashierDetailStartDate}
                    onChange={(e) => setCashierDetailStartDate(e.target.value)}
                    className="bg-transparent text-[10.5px] font-bold text-indigo-950 outline-none cursor-pointer focus:ring-0"
                  />
                </div>
                <div className="h-3 w-px bg-slate-200"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black text-slate-400">S/D:</span>
                  <input
                    type="date"
                    value={cashierDetailEndDate}
                    onChange={(e) => setCashierDetailEndDate(e.target.value)}
                    className="bg-transparent text-[10.5px] font-bold text-indigo-950 outline-none cursor-pointer focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin">
              {(() => {
                const breakdown = getCashierActivityBreakdown(
                  selectedActiveCashier.id,
                  cashierDetailStartDate,
                  cashierDetailEndDate
                );

                const activities = [
                  { 
                    label: "Membuat Transaksi Baru", 
                    count: breakdown.newTransactionsCount, 
                    color: "bg-emerald-500", 
                    textColor: "text-emerald-700",
                    bgClass: "bg-emerald-50/60",
                    borderClass: "border-emerald-100",
                    icon: "📝"
                  },
                  { 
                    label: "Cuci Pakaian", 
                    count: breakdown.cuciCount, 
                    color: "bg-sky-500", 
                    textColor: "text-sky-700",
                    bgClass: "bg-sky-50/60",
                    borderClass: "border-sky-100",
                    icon: "🧼"
                  },
                  { 
                    label: "Setrika / Lipat", 
                    count: breakdown.setrikaCount, 
                    color: "bg-amber-500", 
                    textColor: "text-amber-700",
                    bgClass: "bg-amber-50/60",
                    borderClass: "border-amber-100",
                    icon: "👔"
                  },
                  { 
                    label: "Packing / Pengemasan", 
                    count: breakdown.packingCount, 
                    color: "bg-indigo-500", 
                    textColor: "text-indigo-700",
                    bgClass: "bg-indigo-50/60",
                    borderClass: "border-indigo-100",
                    icon: "📦"
                  },
                  { 
                    label: "Menyelesaikan Layanan (Ambil)", 
                    count: breakdown.selesaiCount, 
                    color: "bg-violet-500", 
                    textColor: "text-violet-700",
                    bgClass: "bg-violet-50/60",
                    borderClass: "border-violet-100",
                    icon: "✅"
                  },
                ];

                return (
                  <div className="space-y-4">
                    {/* Top Total Count Box */}
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Produktivitas Kerja Beres</span>
                        <h4 className="text-lg font-black font-mono mt-0.5">{breakdown.totalActivities} Operasi Kerja</h4>
                      </div>
                      <span className="p-1 px-3 bg-indigo-600 rounded-full text-[10px] font-black uppercase">
                        Sektor Active
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest pt-1">
                      Rincian Proses Aktivitas Kerja
                    </div>

                    {/* Progress Metrics list */}
                    <div className="space-y-3">
                      {activities.map((act) => {
                        const percent = breakdown.totalActivities > 0 
                          ? Math.round((act.count / breakdown.totalActivities) * 100) 
                          : 0;

                        return (
                          <div 
                            key={act.label} 
                            className={`p-3.5 border ${act.borderClass} ${act.bgClass} rounded-2xl flex flex-col gap-1.5 transition-all duration-200`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold flex items-center gap-2 text-slate-800">
                                <span className="text-sm shrink-0">{act.icon}</span>
                                {act.label}
                              </span>
                              <strong className={`${act.textColor} text-sm font-mono`}>
                                {act.count} <span className="text-[10px] font-semibold text-slate-400">({percent}%)</span>
                              </strong>
                            </div>
                            {/* Bar segment */}
                            <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${act.color} transition-all duration-500`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedActiveCashier(null)}
                className="px-4 py-2 bg-[#0D1B2A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1. MODAL DETAIL OMZET AKUMULASI DENGAN DATE PICKER */}
      {showAccumulatedOmzetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-800 font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="p-6 bg-indigo-950 text-white flex items-center justify-between border-b border-indigo-900">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-400 animate-pulse" />
                  Rincian Omzet Akumulasi (Lunas)
                </h3>
              </div>
              <button
                onClick={() => setShowAccumulatedOmzetModal(false)}
                className="p-1.5 hover:bg-indigo-900 rounded-lg text-indigo-200 hover:text-white transition"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Date Pickers Filter Bar */}
            <div className="p-4 bg-indigo-50 text-indigo-900 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-extrabold text-indigo-850">📅 Filter Rentang Tanggal:</span>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-indigo-200">
                  <span className="text-slate-400">Dari:</span>
                  <input
                    type="date"
                    value={accumulatedStartDate}
                    onChange={(e) => setAccumulatedStartDate(e.target.value)}
                    className="bg-transparent font-bold outline-none text-indigo-950 focus:ring-0 text-[11px]"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-indigo-200">
                  <span className="text-slate-400">Sampai:</span>
                  <input
                    type="date"
                    value={accumulatedEndDate}
                    onChange={(e) => setAccumulatedEndDate(e.target.value)}
                    className="bg-transparent font-bold outline-none text-indigo-950 focus:ring-0 text-[11px]"
                  />
                </div>
              </div>

              {/* Real-time Total sum based on dates */}
              {(() => {
                const startLimit = accumulatedStartDate;
                const endLimit = accumulatedEndDate + 'T23:59:59';
                const filtered = filteredOrders.filter(o => {
                  const oDate = o.paymentDate || o.createdAt;
                  return oDate >= startLimit && oDate <= endLimit && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
                });
                const totalFilteredOmzet = filtered.reduce((acc, o) => acc + o.totalAmount, 0);

                return (
                  <div className="flex items-center gap-2 bg-indigo-100 border border-indigo-250 text-indigo-800 px-3 py-1.5 rounded-xl">
                    <span>Total Terfilter:</span>
                    <strong className="text-indigo-950 font-mono text-sm">
                      Rp {totalFilteredOmzet.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.5 rounded-md font-bold text-indigo-700">{filtered.length} Trx</span>
                  </div>
                );
              })()}
            </div>

            {/* List Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const startLimit = accumulatedStartDate;
                const endLimit = accumulatedEndDate + 'T23:59:59';
                const filtered = filteredOrders.filter(o => {
                  const oDate = o.paymentDate || o.createdAt;
                  return oDate >= startLimit && oDate <= endLimit && o.paymentStatus === 'Lunas' && o.status !== OrderStatus.DIBATALKAN;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 text-xs font-medium">
                      Tidak ada transaksi lunas dalam rentang tanggal terpilih.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-2">
                          <th className="pb-3 text-left">No Nota</th>
                          <th className="pb-3 text-left">Tanggal Bayar</th>
                          <th className="pb-3 text-left">Nama Pelanggan</th>
                          <th className="pb-3 text-left">Layanan</th>
                          <th className="pb-3 text-center">Metode</th>
                          <th className="pb-3 text-right">Biaya Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filtered.map(order => {
                          const paymentTime = order.paymentDate || order.createdAt;
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/60 transition duration-150 animate-fadeIn">
                              <td className="py-3 font-mono font-bold text-slate-900">{order.invoiceNumber}</td>
                              <td className="py-3 text-[10px] text-slate-500">
                                {new Date(paymentTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                              </td>
                              <td className="py-3 font-medium">
                                <div>{order.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</div>
                              </td>
                              <td className="py-3">
                                <div className="max-w-[180px] truncate" title={order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}>
                                  {order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold uppercase text-slate-600">
                                  {order.paymentMethod}
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-slate-850">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center sm:flex-row flex-col gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleDownloadLunasPDFReport(accumulatedStartDate, accumulatedEndDate)}
                  className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-550 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Unduh Laporan PDF
                </button>
                <button
                  onClick={() => handleDownloadLunasSummaryReport(accumulatedStartDate, accumulatedEndDate)}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Unduh Excel (.xlsx)
                </button>
              </div>
              <button
                onClick={() => setShowAccumulatedOmzetModal(false)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer active:scale-95"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. MODAL DETAIL PIUTANG PELANGGAN YANG MASIH ADA */}
      {showPiutangModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-800 font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="p-6 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-400 animate-pulse" />
                  Rincian Piutang Pelanggan (Belum Lunas)
                </h3>
              </div>
              <button
                onClick={() => setShowPiutangModal(false)}
                className="p-1.5 hover:bg-rose-900 rounded-lg text-rose-200 hover:text-white transition"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Summary Bar */}
            <div className="p-4 bg-rose-50 text-rose-900 border-b border-rose-100 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-rose-850">⚠️ Status Piutang Aktif</span>
              </div>
              <div className="flex items-center gap-2 bg-rose-100 border border-rose-250 text-rose-800 px-3 py-1.5 rounded-xl">
                <span>Total Buku Piutang Berjalan:</span>
                <strong className="text-rose-950 font-mono text-sm">
                  Rp {totalPiutang.toLocaleString('id-ID')}
                </strong>
                <span className="text-[10px] bg-rose-200/60 px-1.5 py-0.5 rounded-md font-bold text-rose-700">
                  {filteredOrders.filter(o => o.paymentStatus !== 'Lunas' && o.status !== OrderStatus.DIBATALKAN).length} Transaksi
                </span>
              </div>
            </div>

            {/* List Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const unfulfilled = filteredOrders.filter(o => o.paymentStatus !== 'Lunas' && o.status !== OrderStatus.DIBATALKAN);

                if (unfulfilled.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 text-xs font-medium">
                      Hebat! Seluruh piutang pelanggan lunas terbayar 🎉
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-2">
                          <th className="pb-3 text-left">No Nota</th>
                          <th className="pb-3 text-left">Tanggal Masuk</th>
                          <th className="pb-3 text-left">Nama Pelanggan</th>
                          <th className="pb-3 text-left">Layanan</th>
                          <th className="pb-3 text-center">Status Cucian</th>
                          <th className="pb-3 text-center font-bold text-rose-600">Terutang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {unfulfilled.map(order => {
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/60 transition duration-150 animate-fadeIn">
                              <td className="py-3 font-mono font-bold text-slate-900">{order.invoiceNumber}</td>
                              <td className="py-3 text-[10px] text-slate-500">
                                {new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                              </td>
                              <td className="py-3 font-medium">
                                <div>{order.customerName}</div>
                                <div className="text-[10px] text-rose-600 font-mono font-semibold flex items-center gap-1.5 mt-0.5">
                                  <span>📞 {order.customerPhone}</span>
                                  <a 
                                    href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-1 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-150 text-[8px] active:scale-95 font-bold uppercase"
                                    title="Hubungi via WA"
                                  >
                                    WA ➔
                                  </a>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="max-w-[180px] truncate" title={order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}>
                                  {order.items.map(it => `${it.serviceName} (${it.quantity}x)`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded bg-amber-50 text-amber-700 border border-amber-150">
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 text-right font-black text-rose-600">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPiutangModal(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer active:scale-95"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. MODAL DETAIL PENGELUARAN (OPEX) DENGAN DATE PICKER */}
      {showOPEXModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-800 font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="p-6 bg-red-950 text-white flex items-center justify-between border-b border-red-900">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400 animate-pulse" />
                  Rincian Pengeluaran Operasional (OPEX)
                </h3>
              </div>
              <button
                onClick={() => setShowOPEXModal(false)}
                className="p-1.5 hover:bg-red-900 rounded-lg text-red-200 hover:text-white transition"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Date Pickers Filter Bar */}
            <div className="p-4 bg-red-50 text-red-900 border-b border-red-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-extrabold text-red-850">📅 Filter Rentang Tanggal:</span>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-red-200">
                  <span className="text-slate-400">Dari:</span>
                  <input
                    type="date"
                    value={opexFilterStartDate}
                    onChange={(e) => setOpexFilterStartDate(e.target.value)}
                    className="bg-transparent font-bold outline-none text-red-950 focus:ring-0 text-[11px]"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-red-200">
                  <span className="text-slate-400">Sampai:</span>
                  <input
                    type="date"
                    value={opexFilterEndDate}
                    onChange={(e) => setOpexFilterEndDate(e.target.value)}
                    className="bg-transparent font-bold outline-none text-red-950 focus:ring-0 text-[11px]"
                  />
                </div>
              </div>

              {/* Real-time Total sum based on dates */}
              {(() => {
                const startLimit = opexFilterStartDate;
                const endLimit = opexFilterEndDate + 'T23:59:59';
                const filtered = expenses.filter(e => {
                  return e.date >= startLimit && e.date <= endLimit;
                });
                const totalFilteredOPEX = filtered.reduce((acc, e) => acc + e.amount, 0);

                return (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-250 text-red-800 px-3 py-1.5 rounded-xl">
                    <span>Total Pengeluaran Terfilter:</span>
                    <strong className="text-red-950 font-mono text-sm">
                      Rp {totalFilteredOPEX.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[10px] bg-red-200/60 px-1.5 py-0.5 rounded-md font-bold text-red-700">{filtered.length} Catatan</span>
                  </div>
                );
              })()}
            </div>

            {/* List Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const startLimit = opexFilterStartDate;
                const endLimit = opexFilterEndDate + 'T23:59:59';
                const filtered = expenses.filter(e => {
                  return e.date >= startLimit && e.date <= endLimit;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 text-xs font-medium">
                      Tidak ada catatan pengeluaran operasional dalam rentang tanggal terpilih.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] pb-2">
                          <th className="pb-3 text-left">Tanggal</th>
                          <th className="pb-3 text-left">Deskripsi Pengeluaran</th>
                          <th className="pb-3 text-left">Kategori</th>
                          <th className="pb-3 text-left">Disimpan Oleh</th>
                          <th className="pb-3 text-right">Jumlah Biaya</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filtered.map(exp => {
                          return (
                            <tr key={exp.id} className="hover:bg-slate-50/60 transition duration-150 animate-fadeIn overflow-hidden">
                              <td className="py-3 font-mono text-slate-500">
                                {new Date(exp.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                              </td>
                              <td className="py-3 font-semibold text-slate-900">{exp.description}</td>
                              <td className="py-3 text-left">
                                <span className="px-2 py-0.5 text-[8.5px] font-bold rounded bg-red-50 text-red-700 border border-red-150 uppercase">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[10.5px]">{exp.recordedBy || 'Owner'}</td>
                              <td className="py-3 text-right font-black text-rose-600">Rp {exp.amount.toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowOPEXModal(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer active:scale-95"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: SERVICE DEACTIVATION CONFIRMATION */}
      {deleteConfirmService && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-slate-800 animate-scaleIn">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
                ⚠️
              </div>
              <h3 className="text-sm font-black text-slate-905">Apakah Anda ingin menonaktifkan layanan ini?</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono">
                Layanan: <strong className="text-slate-805 text-xs">{deleteConfirmService.name}</strong><br/>
                Kategori: <span className="capitalize">{deleteConfirmService.category}</span><br/>
                Tarif: <span>Rp {deleteConfirmService.price.toLocaleString()} / {deleteConfirmService.unit}</span>
              </p>
              <p className="text-[11px] text-rose-500 font-semibold text-left">
                *Layanan yang dinonaktifkan tidak akan muncul lagi pada menu input transaksi kasir, namun histori transaksi terdahulu akan tetap aman.
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDeleteConfirmService(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => executeDeleteService(deleteConfirmService.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CASHIER ACCOUNT DELETION CONFIRMATION */}
      {deleteConfirmCashier && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-slate-800 animate-scaleIn">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
                👤
              </div>
              <h3 className="text-sm font-black text-slate-905">Apakah Anda ingin menghapus akun kasir ini?</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                Nama Kasir: <strong className="text-slate-805 text-xs font-mono">{deleteConfirmCashier.name}</strong><br/>
                Username: <span className="font-mono bg-slate-100 px-1 rounded text-red-600">{deleteConfirmCashier.username}</span><br/>
                Cabang: <span>{branches.find(b => b.id === deleteConfirmCashier.branchId)?.name || 'Cabang Utama'}</span>
              </p>
              <p className="text-[11px] text-rose-500 font-semibold text-left">
                *Akun ini tidak akan dapat login lagi ke sistem kasir karyawan POS Laugh Dry. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDeleteConfirmCashier(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => executeDeleteCashier(deleteConfirmCashier.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: BRANCH DELETION CONFIRMATION */}
      {deleteConfirmBranch && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-slate-800 animate-scaleIn">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
                🏢
              </div>
              <h3 className="text-sm font-black text-rose-600">Apakah data akan benar dihapus?</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                Nama Cabang: <strong className="text-slate-800 text-xs font-mono">{deleteConfirmBranch.name}</strong><br/>
                Alamat: <span className="text-slate-600">{deleteConfirmBranch.address}</span><br/>
                Telepon: <span className="font-mono text-slate-600">{deleteConfirmBranch.phone}</span>
              </p>
              <p className="text-[11px] text-rose-500 font-semibold text-left">
                *Peringatan: Menghapus cabang ini akan memutuskan integrasi dengan kasir POS atau transaksi yang sebelumnya ditugaskan ke cabang ini.
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDeleteConfirmBranch(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteBranch}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OPEX EXPENSE DELETION CONFIRMATION */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-slate-800 animate-scaleIn">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                💸
              </div>
              <h3 className="text-sm font-black text-slate-905">Konfirmasi Hapus Catatan Pengeluaran</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                Deskripsi: <strong className="text-slate-805">{deleteConfirmExpense.description}</strong><br/>
                Jumlah: <span className="text-red-650 font-black">Rp {deleteConfirmExpense.amount.toLocaleString()}</span><br/>
                Kategori: <span className="font-mono">{deleteConfirmExpense.category}</span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                Tindakan ini akan mengoreksi laporan keuangan owner dan mengembalikan alokasi kas terpakai pada jurnal pengeluaran cabang.
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => executeDeleteExpense(deleteConfirmExpense.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Hapus Jurnal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL DATABASE RE-SEED/RESET CONFIRMATION */}
      {showResetDbConfirm && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-150 shadow-2xl p-6 text-slate-800 animate-scaleIn border-t-4 border-t-red-600">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto text-2xl font-bold animate-bounce">
                🚨
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">🚨 Peringatan Keamanan Owner</h3>
              <h4 className="text-xs font-bold text-slate-700">Apakah Anda yakin ingin me-reset seluruh database?</h4>
              
              <div className="text-xs text-left text-slate-500 leading-relaxed space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
                <p>Tindakan sistem ini akan:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Menghapus seluruh <strong className="text-rose-600">transaksi cucian baru</strong> yang telah diinput kasir.</li>
                  <li>Mengosongkan riwayat deposit saldo & poin member.</li>
                  <li>Mengembalikan setelan template WA & struk cetak ke data bawaan pabrik.</li>
                </ul>
              </div>
              <p className="text-[10px] text-red-600 font-black uppercase tracking-wide">
                *Tindakan ini mutlak bersifat IRREVERSIBLE (tidak bisa dikembalikan)!
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowResetDbConfirm(false)}
                disabled={isResetting}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                Batal, Amankan DB
              </button>
              <button
                onClick={executeResetDatabase}
                disabled={isResetting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm font-mono disabled:opacity-50"
              >
                {isResetting ? "⏳ Menyeka..." : "Ya, Kosongkan DB"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POP-UP SELECTOR FOR SERVICES FORM (CATEGORY, UNIT, ETC.) */}
      {/* ========================================================= */}
      {activePopupField && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-150 shadow-2xl space-y-4 animate-fadeIn relative">
            <button
              type="button"
              onClick={() => setActivePopupField(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 font-black text-xs cursor-pointer bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            {activePopupField === 'category' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <span className="text-xl">🧺</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0F172A] text-sm">Pilih Kategori Model</h4>
                  <p className="text-slate-500 font-semibold text-[10.5px] leading-tight">Tentukan format dasar pengukuran jasa:</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setServiceForm({ ...serviceForm, category: 'kiloan', unit: 'kg' });
                      setActivePopupField(null);
                    }}
                    className={`p-3.5 border rounded-2xl text-left font-bold text-xs transition cursor-pointer flex gap-3 items-center ${
                      serviceForm.category === 'kiloan' ? 'border-emerald-600 bg-emerald-50/45 text-emerald-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-lg">🧺</span>
                    <div>
                      <span className="block font-black text-[11px]">Laundry Kiloan</span>
                      <span className="text-[9.5px] font-normal text-slate-400 block">Dihitung berdasarkan berat (kg) pakaian</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setServiceForm({ ...serviceForm, category: 'satuan', unit: 'pcs' });
                      setActivePopupField(null);
                    }}
                    className={`p-3.5 border rounded-2xl text-left font-bold text-xs transition cursor-pointer flex gap-3 items-center ${
                      serviceForm.category === 'satuan' ? 'border-emerald-600 bg-emerald-50/45 text-emerald-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-lg">🧥</span>
                    <div>
                      <span className="block font-black text-[11px]">Laundry Satuan</span>
                      <span className="text-[9.5px] font-normal text-slate-400 block">Dihitung per biji/pcs pakaian atau karpet</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activePopupField === 'unit' && (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <span className="text-xl">📦</span>
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-extrabold text-[#0F172A] text-sm">Pilih Unit Pengukuran</h4>
                  <p className="text-slate-500 font-semibold text-[10.5px] leading-tight">Gunakan standar ukuran pengali transaksi:</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {['kg', 'pcs', 'lembar', 'pasang', 'meter', 'lusin'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setServiceForm({ ...serviceForm, unit: u });
                        setActivePopupField(null);
                      }}
                      className={`p-2.5 border rounded-xl text-center font-black text-[11px] transition cursor-pointer capitalize ${
                        serviceForm.unit === u ? 'border-emerald-650 bg-emerald-50/45 text-emerald-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[9.5px] font-semibold text-slate-405 block">Masukkan unit kustom jika tidak ada di atas:</span>
                  <input
                    type="text"
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                    placeholder="Contoh: box / kg-dry"
                    className="w-full bg-white border border-slate-250 rounded-xl p-2 text-xs focus:border-emerald-600 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActivePopupField(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setActivePopupField(null)}
                    className="w-full py-1.5 mt-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                  >
                    Simpan Unit Kustom
                  </button>
                </div>
              </div>
            )}

            {activePopupField === 'sizeOption' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
                  <span className="text-xl">📏</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm">Pilih Klasifikasi Ukuran</h4>
                  <p className="text-slate-500 font-semibold text-[10.5px] leading-tight">Pilih ukuran barang satuan yang sesuai:</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 max-h-56 overflow-y-auto">
                  {['Kecil', 'Sedang', 'Besar', 'Tebal', 'Tipis', 'Panjang', 'Pendek'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setServiceForm({ ...serviceForm, sizeOption: opt });
                        setActivePopupField(null);
                      }}
                      className={`p-2.5 border rounded-xl text-center font-black text-[11px] transition cursor-pointer ${
                        serviceForm.sizeOption === opt ? 'border-amber-500 bg-amber-50/45 text-amber-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePopupField === 'promiseDurationUnit' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <span className="text-xl">⏱️</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0F172A] text-sm">Pilih Satuan Estimasi</h4>
                  <p className="text-slate-500 font-semibold text-[10.5px] leading-tight">Pilih format estimasi durasi penyelesaian:</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setServiceForm({ ...serviceForm, promiseDurationUnit: 'Jam' });
                      setActivePopupField(null);
                    }}
                    className={`p-3 border rounded-xl text-center font-black text-xs transition cursor-pointer ${
                      serviceForm.promiseDurationUnit === 'Jam' ? 'border-emerald-600 bg-emerald-55/35 text-emerald-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-lg">⚡</span>
                    <span>Jam (Hours)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setServiceForm({ ...serviceForm, promiseDurationUnit: 'Hari' });
                      setActivePopupField(null);
                    }}
                    className={`p-3 border rounded-xl text-center font-black text-xs transition cursor-pointer ${
                      serviceForm.promiseDurationUnit === 'Hari' ? 'border-emerald-600 bg-emerald-55/35 text-emerald-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-lg">📅</span>
                    <span>Hari (Days)</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 🏞️ DRAG BOUNDARY CONTAINER FOR FIXED MENU */}
      <div 
        ref={dragContainerRef} 
        className="fixed inset-4 md:inset-6 pointer-events-none z-40" 
      />

      {/* 🍔 FIXED DRAGGABLE HAMBURGER MENU (POJOK KIRI/KANAN/ATAS/BAWAH, MENGIKUTI SCROLL, BISA DIPINDAH SECARA FLEKSIBEL) */}
      <motion.div 
        drag
        dragConstraints={dragContainerRef}
        dragMomentum={false}
        dragElastic={0.1}
        onDrag={(event, info) => {
          if (info.point.y > window.innerHeight / 2) {
            setIsMenuAtBottom(true);
          } else {
            setIsMenuAtBottom(false);
          }
          if (info.point.x > window.innerWidth / 2) {
            setIsMenuAtRight(true);
          } else {
            setIsMenuAtRight(false);
          }
        }}
        className={`fixed top-28 left-4 md:left-6 z-50 flex ${isMenuAtBottom ? 'flex-col-reverse' : 'flex-col'} ${isMenuAtRight ? 'items-end' : 'items-start'} gap-3 font-sans cursor-grab active:cursor-grabbing`}
        style={{ touchAction: 'none' }}
      >
        <button
          onClick={() => setShowKebabMenu(!showKebabMenu)}
          id="hamburger-menu-owner-btn"
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 transform active:scale-90 cursor-pointer ${
            showKebabMenu 
              ? 'bg-rose-500 rotate-90 scale-105 border border-rose-400' 
              : 'bg-slate-900 border border-slate-700 hover:bg-slate-800'
          }`}
          title="Buka Menu Navigasi"
        >
          {showKebabMenu ? '✕' : <Menu className="w-5 h-5 animate-pulse" />}
        </button>

        <AnimatePresence>
          {showKebabMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, x: isMenuAtRight ? 20 : -20, y: isMenuAtBottom ? 20 : -20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: isMenuAtRight ? 20 : -20, y: isMenuAtBottom ? 20 : -20 }}
              style={{ transformOrigin: `${isMenuAtBottom ? 'bottom' : 'top'} ${isMenuAtRight ? 'right' : 'left'}` }}
              className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-3xl p-4 w-72 max-h-[85vh] overflow-y-auto space-y-3 scrollbar-thin"
            >
              {/* Header */}
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-slate-850 text-[11px] uppercase tracking-wider">Navigasi Owner</h5>
                  <p className="text-[9px] text-slate-400">Pilih menu untuk berpindah tampilan</p>
                </div>
                <button 
                  onClick={() => setShowKebabMenu(false)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer h-5 w-5 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Menu list */}
              <div className="space-y-1">
                {[
                  { key: 'analytics', icon: '📈', label: 'Ringkasan Analytics' },
                  { key: 'services', icon: '⚙️', label: 'Kelola Jasa & Layanan' },
                  { key: 'expenses', icon: '💸', label: 'Pengeluaran Usaha' },
                  { key: 'cashiers', icon: '👥', label: 'Atur Akun Kasir' },
                  { key: 'branches', icon: '🏢', label: 'Master Data & Cabang' },
                  { key: 'settings', icon: '🔧', label: 'Pengaturan & WA Templates' },
                  { key: 'attendance', icon: '📅', label: 'Rekap Absensi Karyawan' },
                  { key: 'owner_mgmt', icon: '👑', label: 'Owner & Staff Management' }
                ].map((item) => {
                  const isActive = activeSubTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveSubTab(item.key);
                        setShowKebabMenu(false);
                      }}
                      className={`w-full flex items-center justify-start gap-2.5 p-2 rounded-xl text-left font-bold transition text-xs cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-sky-400 shadow-md font-black scale-[1.02]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}

// Global Help formatting function
const formatCompletionDate = (isoStr: string) => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
