/**
 * PrinterManager Service for LaughDry POS
 *
 * CHANGELOG:
 * - [FIX] fontSize px dari receiptElements dipetakan ke ESC/POS size command
 * - [FIX] Logo header (base64) dikonversi ke raster bitmap ESC/POS
 * - [FIX] QR verifikasi hardcoded dihapus; QRIS dibaca dari settings
 * - [FIX] order_status: cetak status laundry + metode/status bayar secara terpisah & konsisten
 * - [FIX] Parfum: dicetak meski string kosong dicegah dengan trim check
 * - [FIX] Notes: dicetak sebagai blok mandiri setelah total_charge, ikuti showNotesInReceipt
 * - [FIX] Alamat outlet dicetak tepat di bawah nama outlet (sebelum nomor telepon)
 */

import { GlobalBluetoothManager, ConnectionType, PaperSize } from '../lib/bluetoothManager';

export interface PrinterDevice {
  name: string;
  address: string;
  paired: boolean;
  type?: ConnectionType;
}

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

export const ESC_POS_COMMANDS = {
  INIT:             [ESC, 0x40],
  ALIGN_LEFT:       [ESC, 0x61, 0x00],
  ALIGN_CENTER:     [ESC, 0x61, 0x01],
  ALIGN_RIGHT:      [ESC, 0x61, 0x02],
  BOLD_ON:          [ESC, 0x45, 0x01],
  BOLD_OFF:         [ESC, 0x45, 0x00],
  FONT_SIZE_NORMAL: [GS,  0x21, 0x00],
  FONT_SIZE_LARGE:  [GS,  0x21, 0x11],
  FONT_SIZE_DBL_H:  [GS,  0x21, 0x01],
  FONT_SIZE_DBL_W:  [GS,  0x21, 0x10],
  FEED_AND_CUT:     [GS,  0x56, 0x42, 0x00],
};

// ─── Font size mapping: px dari UI → ESC/POS size ────────────────────────────
type EscFontSize = 'normal' | 'double-width' | 'double-height' | 'large';

function mapFontSizePxToEsc(px: number): EscFontSize {
  if (px <= 10) return 'normal';
  if (px <= 13) return 'double-width';
  if (px <= 17) return 'double-height';
  return 'large';
}

// ─── Konversi base64 PNG/JPG → raster bitmap ESC/POS ─────────────────────────
async function base64ImageToEscPosRaster(
  base64Src: string,
  targetWidthDots: number = 200
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = targetWidthDots / img.width;
        const w = targetWidthDots;
        const h = Math.floor(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const bytesPerRow = Math.ceil(w / 8);
        const rasterBytes: number[] = [];
        for (let row = 0; row < h; row++) {
          for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const px = byteIdx * 8 + bit;
              if (px < w) {
                const idx = (row * w + px) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                if (gray < 128) byte |= (0x80 >> bit);
              }
            }
            rasterBytes.push(byte);
          }
        }
        const xL = bytesPerRow & 0xFF;
        const xH = (bytesPerRow >> 8) & 0xFF;
        const yL = h & 0xFF;
        const yH = (h >> 8) & 0xFF;
        resolve(new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH, ...rasterBytes]));
      };
      img.onerror = () => {
        console.warn('[PRINTER] Gagal memuat gambar, dilewati.');
        resolve(new Uint8Array(0));
      };
      img.src = base64Src;
    } catch (e) {
      console.warn('[PRINTER] Error konversi gambar:', e);
      resolve(new Uint8Array(0));
    }
  });
}

// ─── Default elements (cermin dari OwnerDashboard) ───────────────────────────
const DEFAULT_RECEIPT_ELEMENTS = [
  { id: 'outlet_name',       fontSize: 13, alignment: 'center', isBold: true,  isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'invoice_number',    fontSize: 11, alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'customer_name',     fontSize: 13, alignment: 'left',   isBold: true,  isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'customer_phone',    fontSize: 9,  alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'order_date',        fontSize: 10, alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'cashier_info',      fontSize: 9,  alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'order_status',      fontSize: 9,  alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'estimated_time',    fontSize: 9,  alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'perfume_fragrance', fontSize: 10, alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'item_list',         fontSize: 10, alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'total_charge',      fontSize: 12, alignment: 'left',   isBold: true,  isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'member_points',     fontSize: 10, alignment: 'left',   isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
  { id: 'footer_terms',      fontSize: 9,  alignment: 'center', isBold: false, isVisible: true, isVisibleInti: true, showPrefix: true },
];

// ─── ESCPosGenerator ──────────────────────────────────────────────────────────
export class ESCPosGenerator {
  private paperSize: PaperSize;
  private maxColumns: number;

  constructor(paperSize: PaperSize = 58) {
    this.paperSize = paperSize;
    this.maxColumns = paperSize === 80 ? 48 : 32;
  }

  public setPaperSize(size: PaperSize) {
    this.paperSize = size;
    this.maxColumns = size === 80 ? 48 : 32;
  }

  public getMaxColumns(): number { return this.maxColumns; }
  public getPaperSize(): PaperSize { return this.paperSize; }

  public stringToBytes(str: string): Uint8Array {
    const r = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      r[i] = c < 128 ? c : 63;
    }
    return r;
  }

  public init(): Uint8Array { return new Uint8Array(ESC_POS_COMMANDS.INIT); }

  public align(type: 'left' | 'center' | 'right'): Uint8Array {
    if (type === 'center') return new Uint8Array(ESC_POS_COMMANDS.ALIGN_CENTER);
    if (type === 'right')  return new Uint8Array(ESC_POS_COMMANDS.ALIGN_RIGHT);
    return new Uint8Array(ESC_POS_COMMANDS.ALIGN_LEFT);
  }

  public bold(on: boolean): Uint8Array {
    return new Uint8Array(on ? ESC_POS_COMMANDS.BOLD_ON : ESC_POS_COMMANDS.BOLD_OFF);
  }

  public fontSizeCmd(escSize: EscFontSize): Uint8Array {
    if (escSize === 'large')         return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_LARGE);
    if (escSize === 'double-width')  return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_DBL_W);
    if (escSize === 'double-height') return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_DBL_H);
    return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_NORMAL);
  }

  public text(
    content: string,
    options?: { align?: 'left' | 'center' | 'right'; bold?: boolean; escSize?: EscFontSize }
  ): Uint8Array {
    const bytes: number[] = [];
    if (options?.align)            bytes.push(...this.align(options.align));
    if (options?.bold !== undefined) bytes.push(...this.bold(options.bold));
    if (options?.escSize)          bytes.push(...this.fontSizeCmd(options.escSize));
    bytes.push(...Array.from(this.stringToBytes(content)));
    if (options?.escSize)          bytes.push(...this.fontSizeCmd('normal'));
    if (options?.bold)             bytes.push(...this.bold(false));
    if (options?.align)            bytes.push(...this.align('left'));
    return new Uint8Array(bytes);
  }

  public line(char: string = '-'): Uint8Array {
    return this.stringToBytes(char.repeat(this.maxColumns) + '\n');
  }

  public keyValue(key: string, value: string): Uint8Array {
    const spaces = this.maxColumns - key.length - value.length;
    if (spaces <= 0) return this.stringToBytes(key.substring(0, this.maxColumns - value.length - 1) + ' ' + value + '\n');
    return this.stringToBytes(key + ' '.repeat(spaces) + value + '\n');
  }

  public itemRow(name: string, qty: string | number, price: number, subtotal: number): Uint8Array {
    const fp  = `Rp${price.toLocaleString('id-ID')}`;
    const fs  = `Rp${subtotal.toLocaleString('id-ID')}`;
    const qxp = `${qty} x ${fp}`;
    if (this.paperSize === 80) {
      return this.stringToBytes(name.padEnd(24).substring(0, 24) + qxp.padStart(12).substring(0, 12) + fs.padStart(12).substring(0, 12) + '\n');
    }
    const line1 = this.stringToBytes(name.substring(0, this.maxColumns) + '\n');
    const line2 = this.keyValue(qxp, fs);
    const res = new Uint8Array(line1.length + line2.length);
    res.set(line1, 0); res.set(line2, line1.length);
    return res;
  }

  public qrCode(data: string): Uint8Array {
    if (this.paperSize === 80) {
      const bytes: number[] = [];
      const len = data.length + 3;
      bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04);
      bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
      bytes.push(GS, 0x28, 0x6B, len & 0xFF, (len >> 8) & 0xFF, 0x31, 0x50, 0x30);
      for (let i = 0; i < data.length; i++) bytes.push(data.charCodeAt(i));
      bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30, LF);
      return new Uint8Array(bytes);
    }
    // 58mm: cetak sebagai teks URL (aman untuk semua printer)
    return this.stringToBytes(`\n${data}\n\n`);
  }

  public feedAndCut(): Uint8Array {
    return this.paperSize === 80
      ? new Uint8Array([LF, LF, LF, LF, ...ESC_POS_COMMANDS.FEED_AND_CUT])
      : new Uint8Array([LF, LF, LF, LF, LF, LF]);
  }
}

// ─── PrinterManager ───────────────────────────────────────────────────────────
export class PrinterManager {
  private escposGenerator: ESCPosGenerator;
  private debugLogs: string[] = [];
  private logCallbacks: Set<(logs: string[]) => void> = new Set();

  public isConnectedState   = localStorage.getItem('laughdry_printer_connected') === 'true';
  public connectedName      = localStorage.getItem('laughdry_printer_name') || '';
  public connectedAddress   = localStorage.getItem('laughdry_printer_address') || '';
  public activeConnectionType: ConnectionType = (localStorage.getItem('laughdry_connection_type') as ConnectionType) || 'bluetooth';
  public paperSize: PaperSize = (parseInt(localStorage.getItem('laughdry_paper_size') || '58') as PaperSize);

  constructor() { this.escposGenerator = new ESCPosGenerator(this.paperSize); }

  public subscribeLogs(cb: (logs: string[]) => void) {
    this.logCallbacks.add(cb);
    cb([...this.debugLogs]);
    return () => this.logCallbacks.delete(cb);
  }

  private addLog(step: string) {
    const msg = `[${new Date().toLocaleTimeString('id-ID')}] ${step}`;
    this.debugLogs.push(msg);
    if (this.debugLogs.length > 50) this.debugLogs.shift();
    console.log(`[PRINTER_LOG] ${step}`);
    this.logCallbacks.forEach(cb => cb([...this.debugLogs]));
  }

  public getLogs() { return this.debugLogs; }
  public clearLogs() { this.debugLogs = []; this.logCallbacks.forEach(cb => cb([])); }
  public isConnected() { return this.isConnectedState; }

  public async connect(
    device: { name: string; address: string },
    connectionType: ConnectionType = 'bluetooth',
    paperSize: PaperSize = 58
  ): Promise<{ success: boolean; message: string }> {
    this.addLog(`🔗 Menghubungkan ke [${device.name}] via ${connectionType} (${paperSize}mm)`);
    this.activeConnectionType = connectionType;
    this.paperSize = paperSize;
    this.escposGenerator.setPaperSize(paperSize);
    localStorage.setItem('laughdry_connection_type', connectionType);
    localStorage.setItem('laughdry_paper_size', paperSize.toString());

    if (connectionType !== 'bluetooth') {
      this.isConnectedState = true;
      this.connectedName    = device.name;
      this.connectedAddress = device.address;
      localStorage.setItem('laughdry_printer_connected', 'true');
      localStorage.setItem('laughdry_printer_name', device.name);
      localStorage.setItem('laughdry_printer_address', device.address);
      return { success: true, message: `Terhubung ke ${connectionType} printer` };
    }

    try {
      const avail = await GlobalBluetoothManager.isBluetoothAvailable();
      if (avail.available && !avail.enabled) this.addLog('⚠️ Bluetooth mati, harap aktifkan.');
      const result = await GlobalBluetoothManager.connectDevice(device.address);
      if (!result?.success) throw new Error('Gagal menyambung via BluetoothManager');
      this.isConnectedState = true;
      this.connectedName    = result.name || device.name;
      this.connectedAddress = result.address || device.address;
      localStorage.setItem('laughdry_printer_connected', 'true');
      localStorage.setItem('laughdry_printer_name', this.connectedName);
      localStorage.setItem('laughdry_printer_address', this.connectedAddress);
      return { success: true, message: `Terhubung ke ${this.connectedName}` };
    } catch (err: any) {
      this.addLog(`❌ Gagal: ${err.message}`);
      return { success: false, message: err.message || 'Gagal menyambung' };
    }
  }

  public async disconnect(): Promise<void> {
    this.addLog('🔌 Disconnect...');
    try {
      if (this.activeConnectionType === 'bluetooth') await GlobalBluetoothManager.disconnectDevice();
    } catch (e) { console.warn('Disconnect failed:', e); }
    finally {
      this.isConnectedState = false;
      this.connectedName    = '';
      this.connectedAddress = '';
      localStorage.setItem('laughdry_printer_connected', 'false');
      localStorage.removeItem('laughdry_printer_name');
      localStorage.removeItem('laughdry_printer_address');
      this.addLog('Status: Terputus');
    }
  }

  public async reconnect(): Promise<boolean> {
    const addr  = localStorage.getItem('laughdry_printer_address');
    const name  = localStorage.getItem('laughdry_printer_name') || 'Printer';
    const type  = (localStorage.getItem('laughdry_connection_type') as ConnectionType) || 'bluetooth';
    const paper = (parseInt(localStorage.getItem('laughdry_paper_size') || '58') as PaperSize);
    if (!addr) return false;
    return (await this.connect({ name, address: addr }, type, paper)).success;
  }

  private async transmitRawData(bytes: Uint8Array): Promise<void> {
    this.addLog('Mengirim data');
    if (this.activeConnectionType === 'bluetooth' && this.connectedAddress) {
      await GlobalBluetoothManager.transmitRaw(this.connectedAddress, bytes);
    } else {
      this.addLog(`[MOCK] ${bytes.length} bytes`);
    }
    this.addLog('Flush');
    await new Promise(r => setTimeout(r, 500));
    this.addLog('Selesai');
  }

  public async testPrint(): Promise<void> {
    this.addLog('⚡ Test Print...');
    const gen = this.escposGenerator;
    const buf: number[] = [];
    const add = (a: Uint8Array) => buf.push(...Array.from(a));
    add(gen.init());
    add(gen.text('LAUGHDRY TEST PRINT\n', { align: 'center', bold: true, escSize: 'large' }));
    add(gen.text(`Kertas: ${this.paperSize}mm | ${this.activeConnectionType.toUpperCase()}\n`, { align: 'center' }));
    add(gen.line());
    add(gen.text('TEST ELEMEN STRUK\n', { align: 'center', bold: true }));
    add(gen.line());
    add(gen.itemRow('Cuci Kilat', '1.5 kg', 12000, 18000));
    add(gen.itemRow('Setrika Express', '1 Pcs', 5000, 5000));
    add(gen.line());
    add(gen.bold(true));
    add(gen.keyValue('TOTAL AKHIR', 'Rp23.000'));
    add(gen.bold(false));
    add(gen.line());
    add(gen.text('SIAP UNTUK TRANSAKSI!\n', { align: 'center', bold: true }));
    add(gen.feedAndCut());
    await this.transmitRawData(new Uint8Array(buf));
  }

  // ── printReceipt ────────────────────────────────────────────────────────────
  public async printReceipt(
    order: any,
    settings: any,
    cashierName: string,
    printMode: 'full' | 'inti' = 'full'
  ): Promise<void> {
    this.addLog(`📋 Cetak: ${order.invoiceNumber} (${printMode})`);
    const gen     = this.escposGenerator;
    const maxCols = gen.getMaxColumns();
    const buf: number[] = [];
    const add = (a: Uint8Array) => buf.push(...Array.from(a));

    // ── Resolve element config ───────────────────────────────────────────────
    const elements: any[] = (settings.receiptElements?.length > 0)
      ? settings.receiptElements
      : DEFAULT_RECEIPT_ELEMENTS;

    const getEl = (id: string): any =>
      elements.find((e: any) => e.id === id)
      || DEFAULT_RECEIPT_ELEMENTS.find(e => e.id === id)
      || { isVisible: true, isVisibleInti: true, isBold: false, alignment: 'left', showPrefix: true, fontSize: 10 };

    const isVisible = (id: string): boolean => {
      const el = getEl(id);
      return printMode === 'inti'
        ? el.isVisible !== false && el.isVisibleInti !== false
        : el.isVisible !== false;
    };

    // ── Helpers formatting ───────────────────────────────────────────────────
    const applyEl = (el: any) => {
      const s = mapFontSizePxToEsc(el.fontSize || 10);
      if (el.alignment === 'center')     add(gen.align('center'));
      else if (el.alignment === 'right') add(gen.align('right'));
      else                               add(gen.align('left'));
      if (el.isBold)    add(gen.bold(true));
      if (s !== 'normal') add(gen.fontSizeCmd(s));
    };

    const resetEl = (el: any) => {
      const s = mapFontSizePxToEsc(el.fontSize || 10);
      if (s !== 'normal') add(gen.fontSizeCmd('normal'));
      if (el.isBold)      add(gen.bold(false));
      add(gen.align('left'));
    };

    const printEl = (id: string, content: string) => {
      if (!isVisible(id)) return;
      const el = getEl(id);
      applyEl(el);
      add(gen.stringToBytes(content + '\n'));
      resetEl(el);
    };

    const justify = (left: string, right: string): string => {
      const sp = maxCols - left.length - right.length;
      return sp <= 0 ? left + ' ' + right : left + ' '.repeat(sp) + right;
    };

    // ════════════════════════════════════════════════════════════════════════
    // BUILD STRUK
    // ════════════════════════════════════════════════════════════════════════
    add(gen.init());

    // ── Logo header ──────────────────────────────────────────────────────────
    if (settings.showHeaderLogoInReceipt && settings.customReceiptHeaderLogoImg) {
      this.addLog('🖼️ Memproses logo...');
      try {
        const logoW   = gen.getPaperSize() === 80 ? 300 : 200;
        const logoBytes = await base64ImageToEscPosRaster(settings.customReceiptHeaderLogoImg, logoW);
        if (logoBytes.length > 0) {
          add(gen.align('center'));
          add(logoBytes);
          add(new Uint8Array([LF]));
          add(gen.align('left'));
          this.addLog(`🖼️ Logo OK: ${logoBytes.length} bytes`);
        }
      } catch { this.addLog('⚠️ Logo gagal, dilanjutkan.'); }
    }

    // ── Iterasi receiptElements sesuai urutan owner ──────────────────────────
    for (const elementConfig of elements) {
      const { id } = elementConfig;
      if (!isVisible(id)) continue;
      const el = getEl(id);

      switch (id) {

        // ── NAMA OUTLET ────────────────────────────────────────────────────
        // [FIX] Urutan: nama → alamat → telepon
        case 'outlet_name': {
          const headerName = (settings.customReceiptHeader || 'LAUGHDRY EXPRESS').toUpperCase();
          applyEl(el);
          headerName.split('\n').forEach((line: string) => {
            if (line.trim()) add(gen.stringToBytes(line.trim() + '\n'));
          });
          resetEl(el);

          // [FIX] Alamat tepat di bawah nama outlet
          if (settings.branchAddress?.trim()) {
            add(gen.align('center'));
            add(gen.stringToBytes(settings.branchAddress.trim() + '\n'));
            add(gen.align('left'));
          }

          // Nomor telepon di bawah alamat
          if (settings.showBranchPhone && settings.branchPhone?.trim()) {
            add(gen.align('center'));
            add(gen.stringToBytes(`Telp: ${settings.branchPhone.trim()}\n`));
            add(gen.align('left'));
          }

          add(gen.line());
          break;
        }

        // ── NOMOR NOTA ─────────────────────────────────────────────────────
        case 'invoice_number': {
          const prefix = el.showPrefix !== false ? 'Nota : ' : '';
          printEl(id, `${prefix}${order.invoiceNumber}`);
          break;
        }

        // ── NAMA PELANGGAN ─────────────────────────────────────────────────
        case 'customer_name': {
          const prefix = el.showPrefix !== false ? 'Cust : ' : '';
          printEl(id, `${prefix}${order.customerName}`);
          break;
        }

        // ── HP PELANGGAN ───────────────────────────────────────────────────
        case 'customer_phone': {
          if (!order.customerPhone?.trim()) break;
          if (settings.showCustomerPhoneInReceipt === false) break;
          const prefix = el.showPrefix !== false ? 'Telp : ' : '';
          printEl(id, `${prefix}${order.customerPhone}`);
          break;
        }

        // ── TANGGAL ────────────────────────────────────────────────────────
        case 'order_date': {
          const tgl    = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
          const prefix = el.showPrefix !== false ? 'Tgl  : ' : '';
          printEl(id, `${prefix}${tgl}`);
          break;
        }

        // ── INFO KASIR ─────────────────────────────────────────────────────
        case 'cashier_info': {
          if (settings.showCashierNameInReceipt === false) break;
          const prefix = el.showPrefix !== false ? 'Kasir: ' : '';
          printEl(id, `${prefix}${cashierName || order.cashierName || 'Karyawan'}`);
          break;
        }

        // ── STATUS ORDER & PEMBAYARAN ──────────────────────────────────────
        // [FIX] Dicetak 3 baris terpisah agar konsisten dengan preview owner:
        //   Stat : <status laundry>
        //   Bayar: <metode pembayaran>
        //   Paid : <status bayar>
        case 'order_status': {
          applyEl(el);
          const showPfx = el.showPrefix !== false;

          // Status laundry (ANTRI, DICUCI, SELESAI, dll)
          if (order.status) {
            add(gen.stringToBytes((showPfx ? 'Stat : ' : '') + order.status + '\n'));
          }

          // Metode pembayaran
          if (order.paymentMethod) {
            add(gen.stringToBytes((showPfx ? 'Bayar: ' : '') + order.paymentMethod + '\n'));
          }

          // Status bayar (Lunas / Belum Lunas)
          if (order.paymentStatus) {
            add(gen.stringToBytes((showPfx ? 'Paid : ' : '') + order.paymentStatus + '\n'));
          }

          resetEl(el);
          break;
        }

        // ── ESTIMASI AMBIL ─────────────────────────────────────────────────
        case 'estimated_time': {
          if (!order.estimatedCompletion) break;
          if (settings.showEstimatedCompletion === false) break;
          const est    = new Date(order.estimatedCompletion).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
          const prefix = el.showPrefix !== false ? 'Est  : ' : '';
          printEl(id, `${prefix}${est}`);
          break;
        }

        // ── AROMA PARFUM ───────────────────────────────────────────────────
        // [FIX] trim() dan cek string kosong agar parfum "Biasa" tetap tercetak
        case 'perfume_fragrance': {
          const parfumVal = (order.perfume || '').trim();
          if (!parfumVal) break;
          const prefix = el.showPrefix !== false ? 'Parfm: ' : '';
          printEl(id, `${prefix}${parfumVal}`);
          break;
        }

        // ── DAFTAR ITEM ────────────────────────────────────────────────────
        case 'item_list': {
          add(gen.line());
          applyEl(el);
          add(gen.stringToBytes('DETAIL LAYANAN\n'));
          resetEl(el);
          const items = order.items || [];
          if (items.length > 0) {
            items.forEach((it: any) => {
              add(gen.itemRow(
                it.serviceName || it.name || 'Layanan',
                it.quantity || it.qty || 1,
                it.price || 0,
                it.subtotal || it.amount || 0
              ));
            });
          } else {
            add(gen.keyValue('Layanan Laundry', `Rp${(order.totalAmount || 0).toLocaleString('id-ID')}`));
          }
          add(gen.line());
          break;
        }

        // ── TOTAL TAGIHAN ──────────────────────────────────────────────────
        case 'total_charge': {
          const total    = order.totalAmount || 0;
          const discount = (order.pointsRedeemed || 0) * 100;
          const final_   = total - discount;
          const showPfx  = el.showPrefix !== false;

          applyEl(el);
          add(gen.stringToBytes(justify(showPfx ? 'TOTAL BIAYA' : 'TOTAL', `Rp${total.toLocaleString('id-ID')}`) + '\n'));
          resetEl(el);

          if (discount > 0) {
            add(gen.stringToBytes(justify('Diskon Member', `-Rp${discount.toLocaleString('id-ID')}`) + '\n'));
          }
          if (final_ !== total || discount > 0) {
            add(gen.bold(true));
            add(gen.stringToBytes(justify('TOTAL BAYAR', `Rp${final_.toLocaleString('id-ID')}`) + '\n'));
            add(gen.bold(false));
          }
          add(gen.align('left'));
          add(gen.line());

          // [FIX] Notes dicetak di sini sebagai sub-blok dari total_charge
          // mengikuti flag showNotesInReceipt dari settings owner
          if (settings.showNotesInReceipt !== false) {
            const notesVal = (order.notes || '').trim();
            if (notesVal) {
              add(gen.stringToBytes(`Catatan:\n"${notesVal}"\n`));
              add(gen.line());
            }
          }
          break;
        }

        // ── POIN MEMBER ────────────────────────────────────────────────────
        case 'member_points': {
          if (settings.showPointsInReceipt === false) break;
          const pts    = Math.floor((order.totalAmount || 0) / 10000);
          const showPfx = el.showPrefix !== false;
          applyEl(el);
          add(gen.stringToBytes(justify(showPfx ? 'Poin Tambah' : '', `+${pts} Poin`) + '\n'));
          resetEl(el);
          add(gen.line());
          break;
        }

        // ── FOOTER / SYARAT ────────────────────────────────────────────────
        case 'footer_terms': {
          if (settings.showTermsInReceipt === false) break;
          const footer = (settings.customReceiptFooter || 'TERIMA KASIH ATAS KUNJUNGAN ANDA!\nSIMPAN STRUK INI SEBAGAI BUKTI.').trim();
          applyEl(el);
          footer.split('\n').forEach((line: string) => {
            if (line.trim()) add(gen.stringToBytes(line.trim() + '\n'));
          });
          resetEl(el);
          add(gen.line());
          break;
        }

        default: break;
      }
    }

    // ── QRIS dari settings (tidak hardcoded) ─────────────────────────────────
    const qrisType = settings.qrisType || 'none';

    if (qrisType === 'static' && settings.qrisStaticQrUrl) {
      this.addLog('📱 Memproses QRIS statis...');
      try {
        const qrisW = gen.getPaperSize() === 80 ? 250 : 180;
        const qrisBytes = await base64ImageToEscPosRaster(settings.qrisStaticQrUrl, qrisW);
        if (qrisBytes.length > 0) {
          add(gen.align('center'));
          add(gen.bold(true));
          add(gen.stringToBytes('SCAN QRIS UNTUK PEMBAYARAN\n'));
          add(gen.bold(false));
          add(qrisBytes);
          add(new Uint8Array([LF]));
          if (settings.qrisMerchantId?.trim()) {
            add(gen.stringToBytes(`ID: ${settings.qrisMerchantId.trim()}\n`));
          }
          add(gen.align('left'));
          add(gen.line());
          this.addLog(`📱 QRIS statis OK: ${qrisBytes.length} bytes`);
        }
      } catch { this.addLog('⚠️ QRIS gagal diproses.'); }

    } else if (qrisType === 'dynamic' && settings.qrisMerchantId?.trim()) {
      add(gen.align('center'));
      add(gen.bold(true));
      add(gen.stringToBytes('PEMBAYARAN QRIS\n'));
      add(gen.bold(false));
      add(gen.stringToBytes(`Merchant ID:\n${settings.qrisMerchantId.trim()}\n`));
      add(gen.stringToBytes('Scan via aplikasi mobile banking\natau dompet digital Anda.\n'));
      add(gen.align('left'));
      add(gen.line());
    }
    // qrisType === 'none': tidak cetak apapun

    add(gen.feedAndCut());
    await this.transmitRawData(new Uint8Array(buf));
  }
}

export const GlobalPrinterManager = new PrinterManager();
