/**
 * PrinterManager Service for LaughDry POS
 * Encapsulates the connection lifecycle (connect, disconnect, testPrint, printReceipt) and manages the state.
 * Fully decoupled from specific UI component and designed to support future USB/WiFi extensions.
 */

import { GlobalBluetoothManager, ConnectionType, PaperSize, BluetoothDevice } from './bluetoothManager';

export interface PrinterDevice {
  name: string;
  address: string;
  paired: boolean;
  type?: ConnectionType;
}

// ESC/POS Command Constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

export const ESC_POS_COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  FONT_SIZE_NORMAL: [GS, 0x21, 0x00],
  FONT_SIZE_LARGE: [GS, 0x21, 0x11], // Double width and height
  FONT_SIZE_HEIGHT_DOUBLE: [GS, 0x21, 0x01],
  FONT_SIZE_WIDTH_DOUBLE: [GS, 0x21, 0x10],
  FEED_AND_CUT: [GS, 0x56, 0x42, 0x00], // Feed and cut paper
};

/**
 * ESC/POS Generator Layer
 */
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

  public getMaxColumns(): number {
    return this.maxColumns;
  }

  public stringToBytes(str: string): Uint8Array {
    const result = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      result[i] = code < 128 ? code : 63; // '?' for non-ASCII
    }
    return result;
  }

  public init(): Uint8Array {
    return new Uint8Array(ESC_POS_COMMANDS.INIT);
  }

  public align(type: 'left' | 'center' | 'right'): Uint8Array {
    if (type === 'center') return new Uint8Array(ESC_POS_COMMANDS.ALIGN_CENTER);
    if (type === 'right') return new Uint8Array(ESC_POS_COMMANDS.ALIGN_RIGHT);
    return new Uint8Array(ESC_POS_COMMANDS.ALIGN_LEFT);
  }

  public bold(on: boolean): Uint8Array {
    return new Uint8Array(on ? ESC_POS_COMMANDS.BOLD_ON : ESC_POS_COMMANDS.BOLD_OFF);
  }

  public fontSize(size: 'normal' | 'large' | 'double-width' | 'double-height'): Uint8Array {
    if (size === 'large') return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_LARGE);
    if (size === 'double-width') return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_WIDTH_DOUBLE);
    if (size === 'double-height') return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_HEIGHT_DOUBLE);
    return new Uint8Array(ESC_POS_COMMANDS.FONT_SIZE_NORMAL);
  }

  public text(content: string, options?: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'large' | 'double-width' | 'double-height' }): Uint8Array {
    const bytes: number[] = [];
    if (options?.align) bytes.push(...this.align(options.align));
    if (options?.bold !== undefined) bytes.push(...this.bold(options.bold));
    if (options?.size) bytes.push(...this.fontSize(options.size));

    const textBytes = this.stringToBytes(content);
    bytes.push(...Array.from(textBytes));

    if (options?.align) bytes.push(...this.align('left'));
    if (options?.bold) bytes.push(...this.bold(false));
    if (options?.size) bytes.push(...this.fontSize('normal'));

    return new Uint8Array(bytes);
  }

  public line(char: string = '-'): Uint8Array {
    return this.stringToBytes(char.repeat(this.maxColumns) + '\n');
  }

  public keyValue(key: string, value: string): Uint8Array {
    const spaceNeeded = this.maxColumns - key.length - value.length;
    if (spaceNeeded <= 0) {
      const truncatedKey = key.substring(0, this.maxColumns - value.length - 1);
      return this.stringToBytes(`${truncatedKey} ${value}\n`);
    }
    return this.stringToBytes(key + " ".repeat(spaceNeeded) + value + "\n");
  }

  public itemRow(name: string, qty: string | number, price: number, subtotal: number): Uint8Array {
    const formattedPrice = `Rp${price.toLocaleString('id-ID')}`;
    const formattedSubtotal = `Rp${subtotal.toLocaleString('id-ID')}`;
    const qtyXPrice = `${qty} x ${formattedPrice}`;

    if (this.paperSize === 80) {
      const nameColWidth = 24;
      const qtyColWidth = 12;
      const subtotalColWidth = 12;

      let displayName = name.padEnd(nameColWidth).substring(0, nameColWidth);
      let displayQty = qtyXPrice.padStart(qtyColWidth).substring(0, qtyColWidth);
      let displaySub = formattedSubtotal.padStart(subtotalColWidth).substring(0, subtotalColWidth);

      return this.stringToBytes(displayName + displayQty + displaySub + "\n");
    } else {
      const firstLine = name.substring(0, this.maxColumns) + "\n";
      const secondLine = this.keyValue(qtyXPrice, formattedSubtotal);
      
      const res = new Uint8Array(firstLine.length + secondLine.length);
      res.set(this.stringToBytes(firstLine), 0);
      res.set(secondLine, firstLine.length);
      return res;
    }
  }

  public barcode(data: string): Uint8Array {
    const bytes: number[] = [0x1D, 0x6B, 0x45, data.length];
    for (let i = 0; i < data.length; i++) {
      bytes.push(data.charCodeAt(i));
    }
    bytes.push(LF);
    return new Uint8Array(bytes);
  }

  public qrCode(data: string): Uint8Array {
    const bytes: number[] = [];
    const len = data.length + 3;
    const pL = len & 0xFF;
    const pH = (len >> 8) & 0xFF;
    
    bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04); 
    bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
    bytes.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < data.length; i++) {
      bytes.push(data.charCodeAt(i));
    }
    bytes.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    bytes.push(LF);
    return new Uint8Array(bytes);
  }

  public image(): Uint8Array {
    const bytes: number[] = [
      0x1D, 0x2A, 0x02, 0x02,
      0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF
    ];
    return new Uint8Array(bytes);
  }

  public feedAndCut(): Uint8Array {
    const bytes: number[] = [LF, LF, LF, LF, ...ESC_POS_COMMANDS.FEED_AND_CUT];
    return new Uint8Array(bytes);
  }
}

/**
 * Service orchestrating connections & raw formatting
 */
export class PrinterManager {
  private escposGenerator: ESCPosGenerator;
  private debugLogs: string[] = [];
  private logCallbacks: Set<(logs: string[]) => void> = new Set();

  public isConnectedState = localStorage.getItem('laughdry_printer_connected') === 'true';
  public connectedName = localStorage.getItem('laughdry_printer_name') || '';
  public connectedAddress = localStorage.getItem('laughdry_printer_address') || '';
  public activeConnectionType: ConnectionType = (localStorage.getItem('laughdry_connection_type') as ConnectionType) || 'bluetooth';
  public paperSize: PaperSize = (parseInt(localStorage.getItem('laughdry_paper_size') || '58') as PaperSize);

  constructor() {
    this.escposGenerator = new ESCPosGenerator(this.paperSize);
  }

  public subscribeLogs(callback: (logs: string[]) => void) {
    this.logCallbacks.add(callback);
    callback([...this.debugLogs]);
    return () => this.logCallbacks.delete(callback);
  }

  private addLog(step: string) {
    const formatted = `[${new Date().toLocaleTimeString('id-ID')}] ${step}`;
    this.debugLogs.push(formatted);
    if (this.debugLogs.length > 50) this.debugLogs.shift();
    console.log(`[PRINTER_LOG] ${step}`);
    this.logCallbacks.forEach(cb => cb([...this.debugLogs]));
  }

  public getLogs(): string[] {
    return this.debugLogs;
  }

  public clearLogs() {
    this.debugLogs = [];
    this.logCallbacks.forEach(cb => cb([]));
  }

  public isConnected(): boolean {
    return this.isConnectedState;
  }

  /**
   * Main connection lifecycle handler
   */
  public async connect(
    device: { name: string; address: string },
    connectionType: ConnectionType = 'bluetooth',
    paperSize: PaperSize = 58
  ): Promise<{ success: boolean; message: string }> {
    this.addLog(`🔗 Memulai alur koneksi ke [${device.name}] via ${connectionType} (${paperSize}mm)`);
    
    this.activeConnectionType = connectionType;
    this.paperSize = paperSize;
    this.escposGenerator.setPaperSize(paperSize);

    localStorage.setItem('laughdry_connection_type', connectionType);
    localStorage.setItem('laughdry_paper_size', paperSize.toString());

    if (connectionType !== 'bluetooth') {
      this.isConnectedState = true;
      this.connectedName = device.name;
      this.connectedAddress = device.address;
      localStorage.setItem('laughdry_printer_connected', 'true');
      localStorage.setItem('laughdry_printer_name', device.name);
      localStorage.setItem('laughdry_printer_address', device.address);
      this.addLog(`Connected to ${connectionType} printer: ${device.name}`);
      return { success: true, message: `Berhasil terhubung ke printer ${connectionType}` };
    }

    try {
      this.addLog("Bluetooth ditemukan");
      const avail = await GlobalBluetoothManager.isBluetoothAvailable();
      if (avail.available && !avail.enabled) {
        this.addLog("⚠️ Bluetooth terdeteksi mati. Harap nyalakan Bluetooth.");
      }

      this.addLog("Socket dibuat");
      this.addLog("Socket.connect()");
      
      const result = await GlobalBluetoothManager.connectDevice(device.address);
      
      if (result && result.success) {
        this.addLog("Connected");
        this.addLog("OutputStream didapat");

        this.isConnectedState = true;
        this.connectedName = result.name || device.name;
        this.connectedAddress = result.address || device.address;
        
        localStorage.setItem('laughdry_printer_connected', 'true');
        localStorage.setItem('laughdry_printer_name', this.connectedName);
        localStorage.setItem('laughdry_printer_address', this.connectedAddress);

        return { success: true, message: `Sukses terhubung ke ${this.connectedName}` };
      } else {
        throw new Error("Gagal menyambung via BluetoothManager");
      }
    } catch (err: any) {
      this.addLog(`❌ Gagal menyambung: ${err.message || err}`);
      return { success: false, message: err.message || "Gagal menyambung ke printer" };
    }
  }

  /**
   * Connection teardown
   */
  public async disconnect(): Promise<void> {
    this.addLog("🔌 Melakukan disconnect printer...");
    try {
      if (this.activeConnectionType === 'bluetooth') {
        await GlobalBluetoothManager.disconnectDevice();
      }
    } catch (e) {
      console.warn("Disconnect failed:", e);
    } finally {
      this.isConnectedState = false;
      this.connectedName = '';
      this.connectedAddress = '';
      localStorage.setItem('laughdry_printer_connected', 'false');
      localStorage.removeItem('laughdry_printer_name');
      localStorage.removeItem('laughdry_printer_address');
      this.addLog("Status: Terputus");
    }
  }

  /**
   * Supports reconnection logic if the connection is dropped
   */
  public async reconnect(): Promise<boolean> {
    const isConn = localStorage.getItem('laughdry_printer_connected') === 'true';
    const addr = localStorage.getItem('laughdry_printer_address');
    const name = localStorage.getItem('laughdry_printer_name') || 'MTP-II';
    const type = (localStorage.getItem('laughdry_connection_type') as ConnectionType) || 'bluetooth';
    const paper = (parseInt(localStorage.getItem('laughdry_paper_size') || '58') as PaperSize);

    if (isConn && addr) {
      this.addLog(`🔄 Mencoba menyambung kembali secara otomatis ke ${name}...`);
      const res = await this.connect({ name, address: addr }, type, paper);
      return res.success;
    }
    return false;
  }

  private async transmitRawData(bytes: Uint8Array): Promise<void> {
    this.addLog("Mengirim data");
    
    if (this.activeConnectionType === 'bluetooth' && this.connectedAddress) {
      await GlobalBluetoothManager.transmitRaw(this.connectedAddress, bytes);
    } else {
      this.addLog(`[MOCK_${this.activeConnectionType.toUpperCase()}] Mengirim data biner berukuran: ${bytes.length} bytes`);
    }

    this.addLog("Flush");
    await new Promise(resolve => setTimeout(resolve, 500));
    this.addLog("Selesai");
  }

  /**
   * Elegant thermal receipt testing pattern
   */
  public async testPrint(): Promise<void> {
    this.addLog("⚡ Memulai pengetesan cetak struk (Test Print)...");
    const gen = this.escposGenerator;
    const size = this.paperSize;

    const buffer: number[] = [];
    const addBytes = (arr: Uint8Array) => buffer.push(...Array.from(arr));

    addBytes(gen.init());
    addBytes(gen.text("LAUGHDRY TEST PRINT\n", { align: 'center', bold: true, size: 'large' }));
    addBytes(gen.text(`Ukuran Kertas: ${size} mm\n`, { align: 'center' }));
    addBytes(gen.text(`Koneksi: ${this.activeConnectionType.toUpperCase()}\n`, { align: 'center' }));
    addBytes(gen.line());
    addBytes(gen.text("TEST ELEMEN STRUK\n", { align: 'center', bold: true }));
    addBytes(gen.line());
    addBytes(gen.itemRow("Layanan Cuci Kilat", "1.5 kg", 12000, 18000));
    addBytes(gen.itemRow("Layanan Setrika Express", "1 Pcs", 5000, 5000));
    addBytes(gen.line());
    addBytes(gen.bold(true));
    addBytes(gen.keyValue("TOTAL AKHIR", "Rp23.000"));
    addBytes(gen.bold(false));
    addBytes(gen.line());
    addBytes(gen.text("SISTEM CETAK POS MANDIRI\n", { align: 'center', bold: true }));
    addBytes(gen.text("SIAP UNTUK TRANSAKSI AKTIF!\n", { align: 'center' }));
    addBytes(gen.qrCode("https://laughdry.com/verify/test"));
    addBytes(gen.feedAndCut());

    await this.transmitRawData(new Uint8Array(buffer));
  }

  /**
   * Complete print receipt handler
   */
  public async printReceipt(order: any, settings: any, cashierName: string): Promise<void> {
    this.addLog(`📋 Memulai pencetakan struk transaksi: ${order.invoiceNumber}`);
    const gen = this.escposGenerator;
    
    const buffer: number[] = [];
    const addBytes = (arr: Uint8Array) => buffer.push(...Array.from(arr));

    addBytes(gen.init());

    const headerName = settings.customReceiptHeader || "LAUGHDRY EXPRESS";
    addBytes(gen.text(headerName.toUpperCase() + "\n", { align: 'center', bold: true, size: 'large' }));
    
    if (settings.branchAddress) {
      addBytes(gen.text(settings.branchAddress + "\n", { align: 'center' }));
    }
    if (settings.branchPhone) {
      addBytes(gen.text(`Telp: ${settings.branchPhone}\n`, { align: 'center' }));
    }
    addBytes(gen.line());

    addBytes(gen.text(`Nota: ${order.invoiceNumber}\n`));
    addBytes(gen.text(`Cust: ${order.customerName}\n`));
    if (order.customerPhone) {
      addBytes(gen.text(`Telp: ${order.customerPhone}\n`));
    }
    const tglStr = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    addBytes(gen.text(`Tgl : ${tglStr}\n`));
    addBytes(gen.text(`Kasir: ${cashierName || order.cashierName || 'Karyawan'}\n`));
    addBytes(gen.text(`Bayar: ${order.paymentMethod} (${order.paymentStatus})\n`));
    addBytes(gen.line());

    addBytes(gen.text("DETAIL LAYANAN LAUNDRY\n", { bold: true }));
    const items = order.items || [];
    items.forEach((it: any) => {
      const sName = it.serviceName || it.name || "Layanan";
      addBytes(gen.itemRow(sName, it.quantity, it.price, it.subtotal));
    });
    addBytes(gen.line());

    addBytes(gen.keyValue("TOTAL BIAYA", `Rp${order.totalAmount.toLocaleString('id-ID')}`));
    const pointsRedeemed = order.pointsRedeemed || 0;
    if (pointsRedeemed > 0) {
      addBytes(gen.keyValue("Diskon Member", `-Rp${(pointsRedeemed * 100).toLocaleString('id-ID')}`));
    }
    const finalBill = order.totalAmount - (pointsRedeemed * 100);
    
    addBytes(gen.bold(true));
    addBytes(gen.keyValue("TOTAL BAYAR", `Rp${finalBill.toLocaleString('id-ID')}`));
    addBytes(gen.bold(false));

    addBytes(gen.line());

    if (order.notes) {
      addBytes(gen.text(`Catatan: "${order.notes}"\n`, { bold: false }));
      addBytes(gen.line());
    }

    const s_k = settings.customReceiptFooter || "Terima Kasih Atas Kepercayaan Anda!";
    addBytes(gen.text(s_k + "\n", { align: 'center' }));
    
    addBytes(gen.qrCode(`https://laughdry.com/verify/${order.invoiceNumber}`));
    addBytes(gen.feedAndCut());

    await this.transmitRawData(new Uint8Array(buffer));
  }
}

export const GlobalPrinterManager = new PrinterManager();
