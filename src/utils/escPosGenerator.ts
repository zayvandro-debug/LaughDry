/**
 * ESC/POS Command Generator Utility for 58mm Thermal Printers
 * Supports text formatting, alignment, font sizing, and double-byte/ASCII commands.
 */

export interface ReceiptItem {
  name: string;
  qty: number | string;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  outletName: string;
  outletAddress?: string;
  phone?: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  cashierName?: string;
  items: ReceiptItem[];
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  discount?: number;
  tax?: number;
  finalAmount?: number;
  notes?: string;
  footerMessage?: string;
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
 * Encodes a string into a simple ASCII / CP850-compatible Uint8Array
 */
export function stringToBytes(str: string): Uint8Array {
  const result = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // basic mapping for standard latin characters and symbols
    result[i] = code < 128 ? code : 63; // '?' for unmappable characters
  }
  return result;
}

/**
 * Formats a key and value to fit a 32-column line (standard 58mm thermal printer width)
 */
export function formatKeyValue(key: string, value: string, maxCols = 32): string {
  const spaceNeeded = maxCols - key.length - value.length;
  if (spaceNeeded <= 0) {
    return `${key.substring(0, maxCols - value.length - 1)} ${value}`;
  }
  return key + " ".repeat(spaceNeeded) + value;
}

/**
 * Formats an item row with name, qty, price, and subtotal for 32 columns
 * Format: 
 * Name
 * Qty x Price                  Subtotal
 */
export function formatItemRow(name: string, qty: number | string, price: number, subtotal: number, maxCols = 32): string {
  const formattedPrice = `Rp${price.toLocaleString('id-ID')}`;
  const formattedSubtotal = `Rp${subtotal.toLocaleString('id-ID')}`;
  const qtyXPrice = `${qty} x ${formattedPrice}`;
  
  // Return two lines for better readability on 58mm
  const firstLine = name.substring(0, maxCols);
  const secondLine = formatKeyValue(qtyXPrice, formattedSubtotal, maxCols);
  return `${firstLine}\n${secondLine}\n`;
}

/**
 * Convert JSON ReceiptData into ESC/POS Command Uint8Array
 */
export function convertJsonToEscPos(data: ReceiptData): Uint8Array {
  const buffer: number[] = [];

  // Helper to push multiple commands or bytes
  const write = (bytes: number[]) => {
    buffer.push(...bytes);
  };

  const writeText = (text: string) => {
    const bytes = stringToBytes(text);
    for (let i = 0; i < bytes.length; i++) {
      buffer.push(bytes[i]);
    }
  };

  const writeLine = (text: string) => {
    writeText(text + "\n");
  };

  // 1. Initialize printer
  write(ESC_POS_COMMANDS.INIT);

  // 2. Header / Outlet Name (Large & Bold & Centered)
  write(ESC_POS_COMMANDS.ALIGN_CENTER);
  write(ESC_POS_COMMANDS.BOLD_ON);
  write(ESC_POS_COMMANDS.FONT_SIZE_WIDTH_DOUBLE);
  writeLine(data.outletName.toUpperCase());
  
  // Outlet Address & Phone (Normal size, centered)
  write(ESC_POS_COMMANDS.BOLD_OFF);
  write(ESC_POS_COMMANDS.FONT_SIZE_NORMAL);
  if (data.outletAddress) {
    writeLine(data.outletAddress);
  }
  if (data.phone) {
    writeLine(`Telp: ${data.phone}`);
  }

  // Divider
  writeLine("-".repeat(32));

  // 3. Invoice Meta Data (Left-aligned)
  write(ESC_POS_COMMANDS.ALIGN_LEFT);
  writeLine(`Nota: ${data.invoiceNumber}`);
  writeLine(`Cust: ${data.customerName}`);
  if (data.customerPhone) {
    writeLine(`Telp: ${data.customerPhone}`);
  }
  writeLine(`Tgl : ${data.date}`);
  if (data.cashierName) {
    writeLine(`Kasir: ${data.cashierName}`);
  }
  writeLine(`Bayar: ${data.paymentMethod} (${data.paymentStatus})`);

  // Divider
  writeLine("-".repeat(32));

  // 4. Receipt Items
  write(ESC_POS_COMMANDS.BOLD_ON);
  writeLine("Layanan / Item");
  write(ESC_POS_COMMANDS.BOLD_OFF);
  
  data.items.forEach(item => {
    const itemText = formatItemRow(item.name, item.qty, item.price, item.subtotal);
    writeText(itemText);
  });

  // Divider
  writeLine("-".repeat(32));

  // 5. Totals (Right-aligned)
  write(ESC_POS_COMMANDS.ALIGN_LEFT);
  const totalLabel = "TOTAL AKHIR";
  const formattedTotal = `Rp${data.totalAmount.toLocaleString('id-ID')}`;
  
  write(ESC_POS_COMMANDS.BOLD_ON);
  writeLine(formatKeyValue(totalLabel, formattedTotal));
  write(ESC_POS_COMMANDS.BOLD_OFF);

  if (data.discount && data.discount > 0) {
    writeLine(formatKeyValue("Diskon", `-Rp${data.discount.toLocaleString('id-ID')}`));
  }
  if (data.tax && data.tax > 0) {
    writeLine(formatKeyValue("Pajak", `Rp${data.tax.toLocaleString('id-ID')}`));
  }
  if (data.finalAmount && data.finalAmount !== data.totalAmount) {
    write(ESC_POS_COMMANDS.BOLD_ON);
    writeLine(formatKeyValue("Total Bayar", `Rp${data.finalAmount.toLocaleString('id-ID')}`));
    write(ESC_POS_COMMANDS.BOLD_OFF);
  }

  // Divider
  writeLine("-".repeat(32));

  // 6. Notes if any
  if (data.notes) {
    write(ESC_POS_COMMANDS.ALIGN_LEFT);
    writeLine("Catatan:");
    writeLine(data.notes);
    writeLine("-".repeat(32));
  }

  // 7. Footer message (Centered)
  write(ESC_POS_COMMANDS.ALIGN_CENTER);
  if (data.footerMessage) {
    writeLine(data.footerMessage);
  } else {
    writeLine("Terima Kasih Atas");
    writeLine("Kepercayaan Anda!");
    writeLine("Laundry Bersih & Wangi");
  }

  // Feed paper by 4 lines and cut
  write([LF, LF, LF, LF]);
  write(ESC_POS_COMMANDS.FEED_AND_CUT);

  return new Uint8Array(buffer);
}

/**
 * Converts a Uint8Array into a Base64 string (compatible with native Java raw input)
 */
export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * Maps standard Order model to structured ReceiptData format
 */
export function mapOrderToReceiptData(order: any, settings: any, cashierName: string): ReceiptData {
  const items: ReceiptItem[] = (order.items || []).map((item: any) => ({
    name: item.serviceName || item.name || "Layanan Laundry",
    qty: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  }));

  const discount = order.pointsRedeemed ? order.pointsRedeemed * 100 : 0; // standard mapping if any
  const total = order.totalAmount;
  const finalAmount = total - discount;

  return {
    outletName: settings.customReceiptHeader || "LAUGHDRY EXPRESS",
    outletAddress: settings.branchAddress || undefined,
    phone: settings.branchPhone || undefined,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone || undefined,
    date: new Date(order.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    cashierName: cashierName || order.cashierName || undefined,
    items,
    paymentMethod: order.paymentMethod || "Cash",
    paymentStatus: order.paymentStatus || "Belum Lunas",
    totalAmount: total,
    discount: discount > 0 ? discount : undefined,
    finalAmount: finalAmount,
    notes: order.notes || undefined,
    footerMessage: settings.customReceiptFooter || undefined,
  };
}
