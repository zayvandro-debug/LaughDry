import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialReportData {
  startDate: string;
  endDate: string;
  totalOmzet: number;
  totalExpenses: number;
  netProfit: number;
  completedOrdersCount: number;
  paymentMethods: { [key: string]: number };
  paymentStatus: { [key: string]: number };
}

interface TransactionItem {
  invoiceNumber: string;
  createdAt: number | string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: string;
  status: string;
}

export const downloadFinancialReportPDF = (data: FinancialReportData, ownerName: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Fonts & styling
  doc.setFont('Helvetica', 'normal');

  // Header Background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('Helvetica', 'bold');
  doc.text('LaughDry Cloud POS', 15, 18);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text('Sistem Manajemen Laundry Terintegrasi & Real-Time Tracking', 15, 24);
  doc.text(`Dicetak oleh: Owner ${ownerName} | Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 15, 30);

  // Body Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text('LAPORAN RINGKASAN KEUANGAN & LABA RUGI', 15, 52);

  // Period Indicator
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Periode Laporan: ${data.startDate} s/d ${data.endDate}`, 15, 58);

  // Horizontal separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 62, 195, 62);

  // Financial KPIs cards
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(15, 68, 55, 24, 'F');
  doc.rect(77, 68, 55, 24, 'F');
  doc.rect(140, 68, 55, 24, 'F');

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(15, 68, 55, 24, 'S');
  doc.rect(77, 68, 55, 24, 'S');
  doc.rect(140, 68, 55, 24, 'S');

  // KPI Inside texts
  // Card 1
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL OMZET (PENDAPATAN)', 18, 74);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`Rp ${data.totalOmzet.toLocaleString('id-ID')}`, 18, 83);

  // Card 2
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PENGELUARAN (OPEX)', 80, 74);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(`Rp ${data.totalExpenses.toLocaleString('id-ID')}`, 80, 83);

  // Card 3
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('LABA / KEUNTUNGAN BERSIH', 143, 74);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(`Rp ${data.netProfit.toLocaleString('id-ID')}`, 143, 83);

  // Detailed Summary Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('Analisis Detail & Distribusi Pembayaran', 15, 102);

  const statsBody = [
    ['Total Transaksi Pesanan', `${data.completedOrdersCount} Nota`],
    ['Metode Pembayaran Tunai (Cash)', `Rp ${(data.paymentMethods['Cash'] || 0).toLocaleString('id-ID')}`],
    ['Metode Pembayaran QRIS (M-Banking)', `Rp ${(data.paymentMethods['QRIS'] || 0).toLocaleString('id-ID')}`],
    ['Metode Pembayaran Transfer Bank / Lainnya', `Rp ${(data.paymentMethods['Transfer'] || 0).toLocaleString('id-ID')}`],
    ['Status Pembayaran Lunas', `${data.paymentStatus['LUNAS'] || 0} Transaksi`],
    ['Status Pembayaran Belum Lunas (Piutang)', `${data.paymentStatus['BELUM LUNAS'] || 0} Transaksi`]
  ];

  autoTable(doc, {
    startY: 107,
    margin: { left: 15, right: 15 },
    head: [['Parameter Operasional', 'Nilai / Akumulasi Rupiah']],
    body: statsBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 90 },
      1: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] }
    }
  });

  // Stamp and legal disclaimer
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'italic');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('* Dokumen analisis pembukuan ini digenerate secara resmi melalui server awan LaughDry.', 15, finalY);
  doc.text('  Segala bentuk data finansial yang tertera bersifat valid sesuai pencatatan basis data relasional.', 15, finalY + 4);

  // Save the PDF doc
  doc.save(`Laporan_Finansial_LaughDry_${data.startDate}_sd_${data.endDate}.pdf`);
};

export const downloadDailyTransactionsPDF = (transactions: TransactionItem[], dateStr: string, ownerName: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 36, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('Helvetica', 'bold');
  doc.text('LaughDry Cloud POS & Tracker', 15, 15);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  doc.text(`LAPORAN TRANSAKSI HARIAN - TANGGAL: ${dateStr}`, 15, 22);
  doc.text(`Petugas Pemeriksa: Owner ${ownerName} | Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 15, 27);

  // Table header & rows
  const headers = [['No Nota', 'Nama Pelanggan', 'No HP', 'Pembayaran', 'Metode', 'Progres', 'Tanggal Cetak', 'Total Biaya']];
  
  const bodyRows = transactions.map((t) => {
    const trxDate = typeof t.createdAt === 'number' 
      ? new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : t.createdAt;

    return [
      t.invoiceNumber,
      t.customerName,
      t.customerPhone,
      t.paymentStatus,
      t.paymentMethod || 'Cash',
      t.status,
      trxDate,
      `Rp ${t.totalAmount.toLocaleString('id-ID')}`
    ];
  });

  // Calc total transaction amounts
  const totalSum = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

  // Add the table on page
  autoTable(doc, {
    startY: 45,
    margin: { left: 15, right: 15 },
    head: headers,
    body: bodyRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { fontStyle: 'bold' },
      6: { cellWidth: 45 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] }
    },
    didDrawPage: (data: any) => {
      // Draw footer summary banner at final page bottom if fit, or just document summary card
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Summary Panel bottom-right style
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(197, finalY, 85, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(197, finalY, 85, 18, 'S');

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL OMZET TANGGAL INI:`, 202, finalY + 7);
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(`Rp ${totalSum.toLocaleString('id-ID')}`, 202, finalY + 14);

  // Disclaimers left
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text('* Rekap laporan kasir harian bersifat final untuk pencocokan laci uang tunai & setoran masuk.', 15, finalY + 7);

  // Save PDF output
  doc.save(`Ringkasan_Transaksi_Harian_LaughDry_${dateStr.replace(/\s+/g, '_')}.pdf`);
};
