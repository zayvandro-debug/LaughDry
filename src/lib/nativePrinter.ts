import { BluetoothClassicPlugin } from './bluetoothPlugin';

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
  class?: number;
}

/**
 * Prints raw ESC/POS command bytes to the specified MAC address using the
 * BluetoothClassicPlugin natively on Android.
 * 
 * @param macAddress MAC address of the paired Bluetooth thermal printer
 * @param data Pre-compiled raw ESC/POS byte commands
 */
export async function printRawBytes(macAddress: string, data: Uint8Array): Promise<void> {
  console.log(`[NATIVE_PRINTER] Mulai pencetakan native ke printer MAC: ${macAddress}, ukuran: ${data.length} bytes`);
  try {
    // Hubungkan ke perangkat Bluetooth Classic SPP target
    await BluetoothClassicPlugin.connect({ address: macAddress });
    
    // Kirim byte mentah secara langsung melalui channel Bluetooth
    const intArray = Array.from(data);
    await BluetoothClassicPlugin.write({ bytes: intArray });
    
    // Tahan koneksi sebentar untuk memastikan buffer terkirim ke printer hardware
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    console.log("[NATIVE_PRINTER] Pengiriman perintah ESC/POS ke printer thermal selesai.");
  } catch (err: any) {
    console.error("[NATIVE_PRINTER] Gagal melakukan pencetakan Bluetooth serial native:", err);
    throw err;
  }
}
