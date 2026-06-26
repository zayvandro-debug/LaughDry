import { registerPlugin } from '@capacitor/core';

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
  class?: number;
}

export interface BluetoothPrinterPluginInterface {
  getAvailability(): Promise<{ available: boolean; enabled: boolean }>;
  requestBluetoothPermissions(): Promise<{ requested: boolean; hasConnectPermission: boolean; hasScanPermission: boolean }>;
  getPairedDevices(): Promise<{ devices: Array<{ name: string; address: string; paired: boolean }> }>;
  startScan(): Promise<{ devices: Array<{ name: string; address: string; paired: boolean }> }>;
  connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }>;
  print(options: { text: string }): Promise<void>;
  printRaw(options: { base64: string }): Promise<void>;
  disconnect(): Promise<{ success: boolean }>;
}

export const BluetoothPrinter = registerPlugin<BluetoothPrinterPluginInterface>('BluetoothPrinter');

/**
 * Converts a Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Prints raw ESC/POS command bytes to the specified MAC address using the
 * BluetoothPrinter plugin natively on Android.
 * 
 * @param macAddress MAC address of the paired Bluetooth thermal printer
 * @param data Pre-compiled raw ESC/POS byte commands
 */
export async function printRawBytes(macAddress: string, data: Uint8Array): Promise<void> {
  console.log(`[NATIVE_PRINTER] Mulai pencetakan native ke printer MAC: ${macAddress}, ukuran: ${data.length} bytes`);
  try {
    // Hubungkan ke perangkat Bluetooth Classic SPP target
    await BluetoothPrinter.connect({ address: macAddress });
    
    // Ubah data biner ESC/POS menjadi string base64 untuk pengiriman aman
    const base64Data = uint8ArrayToBase64(data);
    
    // Kirim byte mentah secara langsung melalui channel Bluetooth
    await BluetoothPrinter.printRaw({ base64: base64Data });
    
    // Tahan koneksi sebentar untuk memastikan buffer terkirim ke printer hardware
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    console.log("[NATIVE_PRINTER] Pengiriman perintah ESC/POS ke printer thermal selesai.");
  } catch (err: any) {
    console.error("[NATIVE_PRINTER] Gagal melakukan pencetakan Bluetooth serial native:", err);
    throw err;
  }
}
